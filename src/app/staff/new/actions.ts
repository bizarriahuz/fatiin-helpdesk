"use server";

import { redirect } from "next/navigation";
import { notifyHelpdeskOfNewTicket } from "@/lib/email/notifications";
import { createClient } from "@/lib/supabase/server";

export type TicketFormState = { error?: string };

const categories = [
  "hardware",
  "software",
  "printer",
  "network",
  "email",
  "ms365",
] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;
const ticketTypes = ["incident", "problem", "request", "change"] as const;

const attachmentTypes = {
  "image/jpeg": { extension: "jpg", signature: [0xff, 0xd8, 0xff] },
  "image/png": { extension: "png", signature: [0x89, 0x50, 0x4e, 0x47] },
  "image/webp": { extension: "webp", signature: [0x52, 0x49, 0x46, 0x46] },
  "application/pdf": { extension: "pdf", signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
} as const;
const maxAttachmentBytes = 5 * 1024 * 1024;
const attachmentBucket = "helpdesk-attachments";

export async function createTicket(
  _previousState: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const ticketType = String(formData.get("ticket_type") ?? "incident");
  const priority = String(formData.get("priority") ?? "normal");
  const mosque = String(formData.get("mosque") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const attachmentValue = formData.get("attachment");
  const attachment = attachmentValue instanceof File && attachmentValue.size > 0 ? attachmentValue : null;

  if (subject.length < 5 || subject.length > 120) {
    return { error: "Enter a short subject between 5 and 120 characters." };
  }
  if (!categories.includes(category as (typeof categories)[number])) {
    return { error: "Choose one of the listed support categories." };
  }
  if (!ticketTypes.includes(ticketType as (typeof ticketTypes)[number])) {
    return { error: "Choose a valid ticket type." };
  }
  if (!priorities.includes(priority as (typeof priorities)[number])) {
    return { error: "Choose a valid request priority." };
  }
  if (mosque.length < 2 || mosque.length > 160) {
    return { error: "Enter the mosque name between 2 and 160 characters." };
  }
  if (description.length < 10 || description.length > 4000) {
    return { error: "Describe the issue in 10 to 4,000 characters." };
  }
  if (location.length > 160) {
    return { error: "Keep the location under 160 characters." };
  }
  if (attachment && attachment.size > maxAttachmentBytes) {
    return { error: "The attachment must be 5 MB or smaller." };
  }

  let attachmentBytes: Uint8Array | null = null;
  let attachmentPath: string | null = null;
  if (attachment) {
    const typeInfo = attachmentTypes[attachment.type as keyof typeof attachmentTypes];
    if (!typeInfo) {
      return { error: "Attach a JPG, PNG, WEBP image, or PDF file." };
    }
    attachmentBytes = new Uint8Array(await attachment.arrayBuffer());
    const hasSignature = typeInfo.signature.every((byte, index) => attachmentBytes?.[index] === byte);
    if (!hasSignature || (attachment.type === "image/webp" && String.fromCharCode(...attachmentBytes.slice(8, 12)) !== "WEBP")) {
      return { error: "That file does not look like a valid image or PDF. Choose another file." };
    }
  }

  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getClaims();
  const requesterId = data?.claims?.sub;
  const requesterEmail = data?.claims?.email;

  if (authError || typeof requesterId !== "string" || typeof requesterEmail !== "string") {
    redirect("/");
  }

  const { data: client, error: clientError } = await supabase
    .from("helpdesk_clients")
    .select("name")
    .eq("name", mosque)
    .maybeSingle();
  if (clientError) return { error: "The site list is unavailable. Ask helpdesk staff to apply migration 012." };
  if (!client) return { error: "Choose a mosque or client site from the list." };

  if (attachment && attachmentBytes) {
    attachmentPath = `${requesterId}/${crypto.randomUUID()}.${attachmentTypes[attachment.type as keyof typeof attachmentTypes].extension}`;
    const { error: uploadError } = await supabase.storage
      .from(attachmentBucket)
      .upload(attachmentPath, attachmentBytes, { contentType: attachment.type, upsert: false });
    if (uploadError) {
      return { error: "We couldn't upload that attachment. Please try again or submit without it." };
    }
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      requester_id: requesterId,
      requester_email: requesterEmail,
      subject,
      category,
      ticket_type: ticketType,
      priority,
      mosque,
      description,
      location: location || null,
      attachment_path: attachmentPath,
    })
    .select("id")
    .single();

  if (error || !ticket) {
    if (attachmentPath) {
      await supabase.storage.from(attachmentBucket).remove([attachmentPath]);
    }
    return {
      error: "We couldn't save the request. Please try again, or check that the helpdesk database setup is complete.",
    };
  }

  const notificationResult = await notifyHelpdeskOfNewTicket({
    subject,
    category,
    ticketType,
    priority,
    requesterEmail,
  });

  redirect(`/staff/tickets/${ticket.id}?notice=${notificationResult}`);
}
