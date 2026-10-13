"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EnrollmentState = {
  message?: string;
  error?: boolean;
  deviceId?: string;
  token?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function enrollEndpoint(
  _previousState: EnrollmentState,
  formData: FormData,
): Promise<EnrollmentState> {
  const assetId = String(formData.get("asset_id") ?? "");
  const hostname = String(formData.get("hostname") ?? "").trim();
  const operatingSystem = String(formData.get("operating_system") ?? "").trim();

  if (!uuidPattern.test(assetId)) return { message: "Choose an asset to monitor.", error: true };
  if (!hostname || hostname.length > 255) return { message: "Enter a device name up to 255 characters.", error: true };
  if (!operatingSystem || operatingSystem.length > 80) return { message: "Enter an operating system up to 80 characters.", error: true };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { message: "Monitoring needs the server-side Supabase service role key configured before devices can be enrolled.", error: true };
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/");

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError || !membership) return { message: "Only designated helpdesk staff can enroll devices.", error: true };

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, mosque")
    .eq("id", assetId)
    .maybeSingle();
  if (assetError || !asset) return { message: "We couldn't find that asset. Refresh the page and try again.", error: true };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: device, error } = await supabase
    .from("endpoint_devices")
    .insert({
      asset_id: asset.id,
      client_name: asset.mosque,
      hostname,
      operating_system: operatingSystem,
      token_hash: tokenHash,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error?.code === "23505") return { message: "This asset is already registered for monitoring.", error: true };
  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return { message: "Apply migration 013 to create endpoint monitoring, then refresh this page.", error: true };
  }
  if (error || !device) return { message: "We couldn't enroll this device. Check the monitoring setup and try again.", error: true };

  revalidatePath("/staff/monitoring");
  revalidatePath("/staff/reports");
  return {
    message: "Device enrolled. Copy its token now; it will not be shown again.",
    deviceId: device.id,
    token,
  };
}

export async function setEndpointActive(
  deviceId: string,
  _previousState: EnrollmentState,
  formData: FormData,
): Promise<EnrollmentState> {
  const activeValue = String(formData.get("is_active") ?? "");
  if (!uuidPattern.test(deviceId) || !["true", "false"].includes(activeValue)) {
    return { message: "Refresh the page and choose a valid monitoring status.", error: true };
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/");
  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError || !membership) return { message: "Only designated helpdesk staff can change device monitoring.", error: true };

  const { data: device, error } = await supabase
    .from("endpoint_devices")
    .update({ is_active: activeValue === "true" })
    .eq("id", deviceId)
    .select("id")
    .maybeSingle();
  if (error || !device) return { message: "We couldn't update monitoring. Apply migration 013 if needed, then refresh and try again.", error: true };

  revalidatePath("/staff/monitoring");
  revalidatePath("/staff/reports");
  return { message: activeValue === "true" ? "Monitoring resumed." : "Monitoring paused." };
}
