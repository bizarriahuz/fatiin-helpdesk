"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type TicketMosqueActionState = { message?: string; error?: boolean };

export async function updateTicketMosque(
  ticketId: string,
  _previousState: TicketMosqueActionState,
  formData: FormData,
): Promise<TicketMosqueActionState> {
  const mosque = String(formData.get("mosque") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    return { message: "This request link is invalid. Refresh the page and try again.", error: true };
  }
  if (mosque.length < 2 || mosque.length > 160) {
    return { message: "Enter the mosque name between 2 and 160 characters.", error: true };
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
    return { message: "Only designated helpdesk staff can edit the mosque for a request.", error: true };
  }

  const { data: client, error: clientError } = await supabase
    .from("helpdesk_clients")
    .select("name")
    .eq("name", mosque)
    .maybeSingle();
  if (clientError) return { message: "The site list is unavailable. Apply migration 012.", error: true };
  if (!client) return { message: "Choose a mosque or client site from the list.", error: true };

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update({ mosque })
    .eq("id", ticketId)
    .select("id")
    .maybeSingle();
  if (error?.code === "42703") {
    return { message: "Apply migration 011 in Supabase before updating the mosque.", error: true };
  }
  if (error || !ticket) {
    return { message: "We couldn't update the mosque. Refresh the page and try again.", error: true };
  }

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/queue");
  revalidatePath("/staff");
  return { message: "Request mosque saved." };
}
