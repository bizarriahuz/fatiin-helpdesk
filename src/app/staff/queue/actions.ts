"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notifyRequesterOfStatusChange } from "@/lib/email/notifications";
import { createClient } from "@/lib/supabase/server";

export type QueueActionState = { message?: string; error?: boolean };

const statuses = ["new", "in_progress", "resolved", "closed"] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;
const ticketTypes = ["incident", "problem", "request", "change"] as const;

export async function updateTicketType(
  ticketId: string,
  _previousState: QueueActionState,
  formData: FormData,
): Promise<QueueActionState> {
  const ticketType = String(formData.get("ticket_type") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(ticketId) || !ticketTypes.includes(ticketType as (typeof ticketTypes)[number])) {
    return { message: "Choose a valid ticket type.", error: true };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/");

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError || !membership) {
    return { message: "Only designated helpdesk staff can update ticket types.", error: true };
  }

  const { data: updated, error } = await supabase
    .from("tickets")
    .update({ ticket_type: ticketType })
    .eq("id", ticketId)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    return { message: "We couldn't update the ticket type. Refresh the page and try again.", error: true };
  }

  revalidatePath("/staff/queue");
  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff");
  return { message: "Ticket type saved." };
}

export async function updateTicketPriority(
  ticketId: string,
  _previousState: QueueActionState,
  formData: FormData,
): Promise<QueueActionState> {
  const priority = String(formData.get("priority") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)
    || !priorities.includes(priority as (typeof priorities)[number])) {
    return { message: "Choose a valid request priority.", error: true };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || typeof claims?.sub !== "string") redirect("/");

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (membershipError || !membership) {
    return { message: "Only designated helpdesk staff can update request priority.", error: true };
  }

  const { data: currentTicket, error: readError } = await supabase
    .from("tickets")
    .select("id, priority")
    .eq("id", ticketId)
    .maybeSingle();
  if (readError || !currentTicket) {
    return { message: "We couldn't find this request. Refresh the queue and try again.", error: true };
  }
  if (currentTicket.priority === priority) return { message: "No priority change was made." };

  const { data: updated, error } = await supabase
    .from("tickets")
    .update({ priority })
    .eq("id", ticketId)
    .eq("priority", currentTicket.priority)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    return { message: "We couldn't update the priority. Refresh the page and try again.", error: true };
  }

  revalidatePath("/staff/queue");
  revalidatePath(`/staff/tickets/${ticketId}`);
  return { message: "Priority saved." };
}

export async function updateTicketStatus(
  ticketId: string,
  _previousState: QueueActionState,
  formData: FormData,
): Promise<QueueActionState> {
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(ticketId) || !statuses.includes(status as (typeof statuses)[number])) {
    return { message: "Choose a valid ticket status.", error: true };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || typeof claims?.sub !== "string") {
    redirect("/");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (membershipError || !membership) {
    return { message: "Only designated helpdesk staff can update tickets.", error: true };
  }

  const { data: currentTicket, error: readError } = await supabase
    .from("tickets")
    .select("id, subject, requester_email, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (readError || !currentTicket) {
    return { message: "We couldn't find this request. Refresh the queue and try again.", error: true };
  }
  if (currentTicket.status === status) {
    return { message: "No status change was made." };
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update({ status })
    .eq("id", ticketId)
    .eq("status", currentTicket.status)
    .select("id, subject, requester_email")
    .maybeSingle();

  if (error || !ticket) {
    return { message: "We couldn't update this request. Refresh the page and try again.", error: true };
  }

  revalidatePath("/staff/queue");
  revalidatePath("/staff");

  if (!ticket.requester_email) {
    return { message: "Status saved. This older request has no email address on file." };
  }

  const notificationResult = await notifyRequesterOfStatusChange({
    id: ticket.id,
    subject: ticket.subject,
    requesterEmail: ticket.requester_email,
    status,
  });

  if (notificationResult === "sent") {
    return { message: "Status saved and email notification sent." };
  }
  if (notificationResult === "not_configured") {
    return { message: "Status saved. Email notifications aren't configured yet." };
  }
  return { message: "Status saved, but the email notification could not be sent." };
}

export async function setTicketAssignment(
  ticketId: string,
  assignmentAction: "claim" | "release",
  _previousState: QueueActionState,
  _formData: FormData,
): Promise<QueueActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(ticketId) || !["claim", "release"].includes(assignmentAction)) {
    return { message: "Choose a valid request.", error: true };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || typeof claims?.sub !== "string") redirect("/");

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (membershipError || !membership) {
    return { message: "Only designated helpdesk staff can assign tickets.", error: true };
  }

  const { data: ticket, error: readError } = await supabase
    .from("tickets")
    .select("assigned_to")
    .eq("id", ticketId)
    .maybeSingle();
  if (readError || !ticket) {
    return { message: "We couldn't find this request. Refresh the page and try again.", error: true };
  }

  if (assignmentAction === "claim") {
    if (ticket.assigned_to === claims.sub) return { message: "This request is already assigned to you." };
    if (ticket.assigned_to) return { message: "Another staff member has already claimed this request." };
    const { data: claimed, error } = await supabase
      .from("tickets")
      .update({ assigned_to: claims.sub })
      .eq("id", ticketId)
      .is("assigned_to", null)
      .select("id")
      .maybeSingle();
    if (error || !claimed) {
      return { message: "This request was just claimed by someone else. Refresh and check its assignment.", error: true };
    }
  } else {
    if (ticket.assigned_to !== claims.sub) {
      return { message: "Only the staff member who claimed this request can release it.", error: true };
    }
    const { data: released, error } = await supabase
      .from("tickets")
      .update({ assigned_to: null })
      .eq("id", ticketId)
      .eq("assigned_to", claims.sub)
      .select("id")
      .maybeSingle();
    if (error || !released) {
      return { message: "We couldn't release this request. Refresh and try again.", error: true };
    }
  }

  revalidatePath("/staff/queue");
  revalidatePath("/staff");
  revalidatePath(`/staff/tickets/${ticketId}`);
  return { message: assignmentAction === "claim" ? "Request assigned to you." : "Request released." };
}
