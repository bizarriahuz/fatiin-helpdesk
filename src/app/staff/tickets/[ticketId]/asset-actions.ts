"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type TicketAssetActionState = { message?: string; error?: boolean };

export async function linkTicketAsset(
  ticketId: string,
  _previousState: TicketAssetActionState,
  formData: FormData,
): Promise<TicketAssetActionState> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    return { message: "This request link is invalid. Refresh the page and try again.", error: true };
  }

  const assetId = String(formData.get("asset_id") ?? "");
  if (assetId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)) {
    return { message: "Choose a valid asset.", error: true };
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
    return { message: "Only designated helpdesk staff can link assets to requests.", error: true };
  }

  if (assetId) {
    const [ticketResult, assetResult] = await Promise.all([
      supabase.from("tickets").select("mosque").eq("id", ticketId).maybeSingle(),
      supabase.from("assets").select("mosque").eq("id", assetId).maybeSingle(),
    ]);
    if (ticketResult.error?.code === "42703" || assetResult.error?.code === "42703") {
      return { message: "Apply migration 011 before linking equipment to a site.", error: true };
    }
    if (ticketResult.error || assetResult.error || !ticketResult.data || !assetResult.data) {
      return { message: "We couldn't verify the mosque for this request and asset. Refresh and try again.", error: true };
    }

    const requestMosque = ticketResult.data.mosque.trim();
    const assetMosque = assetResult.data.mosque.trim();
    if (
      requestMosque.toLocaleLowerCase("en") !== "unspecified"
      && assetMosque.toLocaleLowerCase("en") !== "unspecified"
      && requestMosque.toLocaleLowerCase("en") !== assetMosque.toLocaleLowerCase("en")
    ) {
      return { message: `This asset belongs to ${assetMosque}, but the request is for ${requestMosque}. Update a mosque assignment first.`, error: true };
    }
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update({ asset_id: assetId || null })
    .eq("id", ticketId)
    .select("id")
    .maybeSingle();
  if (error?.code === "42703") {
    return { message: "Apply the ticket-to-asset migration in Supabase before linking assets.", error: true };
  }
  if (error || !ticket) {
    return { message: "We couldn't update this request. Refresh the page and try again.", error: true };
  }

  revalidatePath(`/staff/tickets/${ticketId}`);
  revalidatePath("/staff/queue");
  return { message: assetId ? "Asset linked to this request." : "Asset link removed." };
}
