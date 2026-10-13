"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AssetActionState = { message?: string; error?: boolean };

const categories = ["audio_visual", "network_wifi", "computer_device", "printer", "other"] as const;
const statuses = ["available", "in_use", "in_repair", "retired"] as const;

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

export async function createAsset(
  _previousState: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const assetTag = String(formData.get("asset_tag") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const mosque = String(formData.get("mosque") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(assetTag)) {
    return { message: "Use 1–64 letters, numbers, dots, dashes, or underscores for the asset tag.", error: true };
  }
  if (name.length < 2 || name.length > 120) {
    return { message: "Enter an asset name between 2 and 120 characters.", error: true };
  }
  if (mosque.length < 2 || mosque.length > 160) {
    return { message: "Enter a mosque or client site name between 2 and 160 characters.", error: true };
  }
  if (!categories.includes(category as (typeof categories)[number])) {
    return { message: "Choose an equipment type from the list.", error: true };
  }
  if (location.length > 160 || notes.length > 1000) {
    return { message: "Keep the location under 160 characters and notes under 1,000.", error: true };
  }
  if (!statuses.includes(status as (typeof statuses)[number])) {
    return { message: "Choose a valid asset status.", error: true };
  }

  const { supabase, userId, isStaff } = await getStaffClient();
  if (!isStaff) return { message: "Only helpdesk staff can add equipment.", error: true };

  const { data: client, error: clientError } = await supabase
    .from("helpdesk_clients")
    .select("name")
    .eq("name", mosque)
    .maybeSingle();
  if (clientError) return { message: "The site list is unavailable. Apply migration 012.", error: true };
  if (!client) return { message: "Choose a mosque or client site from the list.", error: true };

  const { error } = await supabase.from("assets").insert({
    asset_tag: assetTag,
    name,
    mosque,
    category,
    location: location || null,
    status,
    notes: notes || null,
    created_by: userId,
  });
  if (error?.code === "23505") return { message: "That asset tag is already in use.", error: true };
  if (error) return { message: "We couldn't save this asset. Check that the asset register and category migrations are applied, then try again.", error: true };

  revalidatePath("/staff/assets");
  return { message: "Equipment added." };
}

export async function updateAssetStatus(
  assetId: string,
  _previousState: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(assetId) || !statuses.includes(status as (typeof statuses)[number])) {
    return { message: "Choose a valid asset status.", error: true };
  }

  const { supabase, isStaff } = await getStaffClient();
  if (!isStaff) return { message: "Only helpdesk staff can update equipment.", error: true };

  const { data: asset, error } = await supabase
    .from("assets")
    .update({ status })
    .eq("id", assetId)
    .select("id")
    .maybeSingle();
  if (error || !asset) return { message: "We couldn't update the asset. Refresh the page and try again.", error: true };

  revalidatePath("/staff/assets");
  return { message: "Equipment status saved." };
}

export async function updateAssetDetails(
  assetId: string,
  _previousState: AssetActionState,
  formData: FormData,
): Promise<AssetActionState> {
  const assetTag = String(formData.get("asset_tag") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const mosque = String(formData.get("mosque") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(assetTag)) {
    return { message: "Use 1–64 letters, numbers, dots, dashes, or underscores for the asset tag.", error: true };
  }
  if (name.length < 2 || name.length > 120) {
    return { message: "Enter an asset name between 2 and 120 characters.", error: true };
  }
  if (mosque.length < 2 || mosque.length > 160) {
    return { message: "Enter a mosque or client site name between 2 and 160 characters.", error: true };
  }
  if (!categories.includes(category as (typeof categories)[number])) {
    return { message: "Choose an equipment type from the list.", error: true };
  }
  if (location.length > 160 || notes.length > 1000) {
    return { message: "Keep the location under 160 characters and notes under 1,000.", error: true };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)) {
    return { message: "This asset link is invalid. Refresh the page and try again.", error: true };
  }

  const { supabase, isStaff } = await getStaffClient();
  if (!isStaff) return { message: "Only helpdesk staff can edit equipment details.", error: true };

  const { data: client, error: clientError } = await supabase
    .from("helpdesk_clients")
    .select("name")
    .eq("name", mosque)
    .maybeSingle();
  if (clientError) return { message: "The site list is unavailable. Apply migration 012.", error: true };
  if (!client) return { message: "Choose a mosque or client site from the list.", error: true };

  const { data: asset, error } = await supabase
    .from("assets")
    .update({ asset_tag: assetTag, name, mosque, category, location: location || null, notes: notes || null })
    .eq("id", assetId)
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return { message: "That asset tag is already in use.", error: true };
  if (error || !asset) return { message: "We couldn't save the asset details. Apply the asset editing migration if needed, then try again.", error: true };

  revalidatePath("/staff/assets");
  return { message: "Asset details saved." };
}
