import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type HeartbeatPayload = {
  deviceId?: unknown;
  hostname?: unknown;
  operatingSystem?: unknown;
  agentVersion?: unknown;
  cpuPercent?: unknown;
  memoryPercent?: unknown;
  diskPercent?: unknown;
};

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "Monitoring is not configured on the server." }, { status: 503 });

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 40 || token.length > 128) {
    return Response.json({ error: "A valid device token is required." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return Response.json({ error: "Send heartbeat data as JSON." }, { status: 415 });
  }

  const text = await request.text();
  if (text.length > 16_384) return Response.json({ error: "Heartbeat payload is too large." }, { status: 413 });
  let payload: HeartbeatPayload;
  try {
    payload = JSON.parse(text) as HeartbeatPayload;
  } catch {
    return Response.json({ error: "Heartbeat payload is not valid JSON." }, { status: 400 });
  }

  if (
    typeof payload.deviceId !== "string"
    || !uuidPattern.test(payload.deviceId)
    || !isShortText(payload.hostname, 255)
    || !isShortText(payload.operatingSystem, 80)
    || !isShortText(payload.agentVersion, 64)
  ) {
    return Response.json({ error: "Heartbeat device details are invalid." }, { status: 400 });
  }

  const cpuPercent = readPercent(payload.cpuPercent);
  const memoryPercent = readPercent(payload.memoryPercent);
  const diskPercent = readPercent(payload.diskPercent);
  if (cpuPercent === undefined || memoryPercent === undefined || diskPercent === undefined) {
    return Response.json({ error: "Health metrics must be numbers between 0 and 100, or null." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: device, error: lookupError } = await admin
    .from("endpoint_devices")
    .select("id, is_active")
    .eq("id", payload.deviceId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError) return Response.json({ error: "Monitoring storage is unavailable." }, { status: 503 });
  if (!device) return Response.json({ error: "Device token was not recognized." }, { status: 401 });
  if (!device.is_active) return Response.json({ error: "Monitoring is paused for this device." }, { status: 403 });

  const checkedAt = new Date().toISOString();
  const metrics = {
    cpu_percent: cpuPercent,
    memory_percent: memoryPercent,
    disk_percent: diskPercent,
    agent_version: payload.agentVersion,
  };
  const { error: updateError } = await admin
    .from("endpoint_devices")
    .update({
      hostname: payload.hostname,
      operating_system: payload.operatingSystem,
      last_seen_at: checkedAt,
      ...metrics,
    })
    .eq("id", device.id);
  if (updateError) return Response.json({ error: "Could not update the device status." }, { status: 503 });

  const { error: historyError } = await admin.from("endpoint_heartbeats").insert({
    device_id: device.id,
    checked_at: checkedAt,
    ...metrics,
  });
  if (historyError) return Response.json({ error: "Could not store device health history." }, { status: 503 });

  return Response.json({ received: true, checkedAt }, { headers: { "Cache-Control": "no-store" } });
}

function isShortText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function readPercent(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : undefined;
}
