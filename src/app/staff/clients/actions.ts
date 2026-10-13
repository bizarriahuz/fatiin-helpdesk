"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ClientActionState = { message?: string; error?: boolean };

async function getStaffClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/");

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return { supabase, userId, isStaff: !membershipError && Boolean(membership) };
}

function validateClientName(name: string) {
  return name.length >= 2 && name.length <= 160;
}

export async function createHelpdeskClient(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!validateClientName(name)) return { message: "Enter a site name between 2 and 160 characters.", error: true };

  const { supabase, userId, isStaff } = await getStaffClient();
  if (!isStaff) return { message: "Only helpdesk staff can add sites.", error: true };

  const { error } = await supabase.from("helpdesk_clients").insert({ name, created_by: userId });
  if (error?.code === "23505") return { message: "That site is already in the list.", error: true };
  if (error) return { message: "We couldn't add the site. Check that migration 012 has been applied.", error: true };

  revalidateClientPages();
  return { message: "Site added." };
}

export async function renameHelpdeskClient(
  clientId: string,
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
    return { message: "This directory entry is invalid. Refresh the page and try again.", error: true };
  }
  if (!validateClientName(name)) return { message: "Enter a site name between 2 and 160 characters.", error: true };

  const { supabase, isStaff } = await getStaffClient();
  if (!isStaff) return { message: "Only helpdesk staff can rename sites.", error: true };

  const { data: client, error } = await supabase
    .from("helpdesk_clients")
    .update({ name })
    .eq("id", clientId)
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return { message: "That site name is already in the list.", error: true };
  if (error) return { message: "We couldn't rename this entry. Check that migration 012 has been applied.", error: true };
  if (!client) return { message: "This directory entry could not be found. Refresh and try again.", error: true };

  revalidateClientPages();
  return { message: "Site renamed. Linked tickets and assets were updated too." };
}

function revalidateClientPages() {
  revalidatePath("/staff/clients");
  revalidatePath("/staff/new");
  revalidatePath("/staff/assets");
  revalidatePath("/staff/queue");
  revalidatePath("/staff/reports");
  revalidatePath("/staff");
}
