"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyTicketMessage } from "@/lib/email/notifications";

export type MessageActionState = { message?: string; error?: boolean };

export async function sendTicketMessage(
  ticketId: string,
  _previousState: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    return { message: "This request link is invalid. Refresh the page and try again.", error: true };
  }

  const body = String(formData.get("message") ?? "").trim();
  if (body.length < 1 || body.length > 4000) {
    return { message: "Write a message of up to 4,000 characters.", error: true };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || typeof claims?.sub !== "string" || typeof claims.email !== "string") redirect("/");

  const { data: membership } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();
  const authorIsStaff = Boolean(membership);

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, subject, requester_id, requester_email, status")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError || !ticket || (!authorIsStaff && ticket.requester_id !== claims.sub)) {
    return { message: "We couldn't find a request you can reply to.", error: true };
  }

  const { error: insertError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    author_id: claims.sub,
    author_email: claims.email,
    body,
  });
  if (insertError) {
    return { message: "We couldn't save your message. Please try again.", error: true };
  }

  let reopened = false;
  let reopenFailed = false;
  if (!authorIsStaff && ["resolved", "closed"].includes(ticket.status)) {
    const { data: reopenedTicket, error: reopenError } = await supabase
      .from("tickets")
      .update({ status: "in_progress" })
      .eq("id", ticketId)
      .eq("requester_id", claims.sub)
      .in("status", ["resolved", "closed"])
      .select("id")
      .maybeSingle();
    reopened = Boolean(reopenedTicket);
    reopenFailed = Boolean(reopenError);
  }

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/queue");
  revalidatePath("/staff");

  const notificationResult = await notifyTicketMessage({
    id: ticketId,
    subject: ticket.subject,
    requesterEmail: ticket.requester_email,
    authorIsStaff,
  });

  const message = notificationResult === "sent"
    ? "Message sent and email notification delivered."
    : notificationResult === "not_configured"
      ? "Message sent. Email notifications aren't configured for this recipient."
      : "Message sent, but the email notification could not be delivered.";
  if (reopened) return { message: `Request reopened. ${message}` };
  if (reopenFailed) return { message: `Message sent, but the request could not be reopened automatically. ${message}`, error: true };
  return { message };
}
