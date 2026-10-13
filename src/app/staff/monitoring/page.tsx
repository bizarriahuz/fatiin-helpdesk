import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { EndpointEnrollmentForm, EndpointMonitoringToggle } from "@/components/endpoint-enrollment-form";
import { EndpointAlertTicketButton } from "@/components/endpoint-alert-ticket-button";
import { createClient } from "@/lib/supabase/server";

export default function MonitoringPage() {
  return <Suspense fallback={<MonitoringLoading />}><MonitoringContent /></Suspense>;
}

async function MonitoringContent() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/");

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError || !membership) redirect("/staff");

  const [{ data: assets, error: assetsError }, { data: devices, error: devicesError }, { data: alerts, error: alertsError }] = await Promise.all([
    supabase.from("assets").select("id, asset_tag, name, mosque").order("asset_tag").limit(500),
    supabase.from("endpoint_devices")
      .select("id, asset_id, client_name, hostname, operating_system, agent_version, is_active, last_seen_at, cpu_percent, memory_percent, disk_percent, defender_real_time_protection, defender_signatures_updated_at, pending_reboot, created_at")
      .order("client_name")
      .order("hostname"),
    supabase.from("endpoint_alerts")
      .select("id, device_id, alert_type, current_value, threshold, first_triggered_at, ticket_id")
      .is("resolved_at", null)
      .order("first_triggered_at", { ascending: false })
      .limit(100),
  ]);
  const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const deviceById = new Map((devices ?? []).map((device) => [device.id, device]));
  const configured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mt-6 border-b border-[#e2e8f0] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Fatiin Multimedia</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17263c]">Devices</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">See device status, resource use, Defender protection, and restart needs.</p>
        </header>

        {!configured && <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">Monitoring is not configured yet. Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to the server&apos;s <code>.env.local</code> and restart the app. Keep this key private and never add a <code>NEXT_PUBLIC_</code> prefix.</p>}

        <section className="mt-8 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#17263c]">Health alerts</h2>
              <p className="mt-1 text-sm text-[#64748b]">Alerts appear when a high reading lasts across three check-ins over at least 10 minutes.</p>
            </div>
            <span className="text-sm text-[#64748b]">{alertsError ? "— active" : `${alerts?.length ?? 0} active`}</span>
          </div>
          {alertsError ? (
            <p role="alert" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Apply migration 017 in the Supabase SQL Editor to enable health alerts.</p>
          ) : alerts?.length ? (
            <ul className="mt-4 divide-y divide-[#e2e8f0]">
              {alerts.map((alert) => {
                const device = deviceById.get(alert.device_id);
                const title = alert.alert_type === "offline"
                  ? "Device offline"
                  : alert.alert_type === "disk_high"
                    ? "Low disk space"
                    : `High ${alert.alert_type === "cpu_high" ? "CPU" : "memory"} use`;
                return (
                  <li key={alert.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#17263c]">{title}{alert.current_value !== null && <span className="font-normal text-[#64748b]"> · {Number(alert.current_value).toFixed(0)}%</span>}</p>
                      <p className="mt-1 text-sm text-[#64748b]">{device ? `${device.hostname} · ${device.client_name}` : "Device details unavailable"} · Started {formatDateTime(alert.first_triggered_at)}{alert.alert_type === "offline" && device?.last_seen_at ? ` · Last check-in ${formatDateTime(device.last_seen_at)}` : ""}</p>
                    </div>
                    <EndpointAlertTicketButton alertId={alert.id} ticketId={alert.ticket_id} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-[#f1f5f9] px-5 py-5 text-sm text-[#64748b]">No active health alerts.</p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-[#17263c]">Add a device</h2>
          <p className="mt-1 text-sm text-[#64748b]">Choose an asset from the list. The enrollment token is shown once after setup.</p>
          {assetsError ? <p role="alert" className="mt-4 text-sm text-red-800">We couldn&apos;t load assets. Check that the asset register is available.</p> : (
            <EndpointEnrollmentForm assets={assets ?? []} configured={configured} />
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#17263c]">Monitored devices</h2>
              <p className="mt-1 text-sm text-[#64748b]">A device is online if it checked in during the last 10 minutes.</p>
            </div>
            <span className="text-sm text-[#64748b]">{devices?.length ?? 0} enrolled</span>
          </div>
          {devicesError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">We couldn&apos;t load monitoring devices. Check that migrations 013 and 019 are applied, then refresh this page.</p>
          ) : devices?.length ? (
            <ul className="mt-5 divide-y divide-[#e2e8f0]">
              {devices.map((device) => {
                const asset = assetById.get(device.asset_id);
                const status = getStatus(device.is_active, device.last_seen_at);
                return (
                  <li key={device.id} className="py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-[#17263c]">{device.hostname}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                        </div>
                        <p className="mt-1 text-sm text-[#0f766e]">{device.client_name} · {asset ? `${asset.asset_tag} · ${asset.name}` : "Asset details unavailable"}</p>
                        <p className="mt-1 text-sm text-[#64748b]">{device.operating_system}{device.agent_version ? ` · Agent ${device.agent_version}` : " · Waiting for first check-in"}</p>
                        <p className="mt-1 text-xs text-[#64748b]">Last check-in: {device.last_seen_at ? formatDateTime(device.last_seen_at) : "Never"}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center sm:min-w-64">
                        <Metric label="CPU" value={device.cpu_percent} />
                        <Metric label="Memory" value={device.memory_percent} />
                        <Metric label="Disk" value={device.disk_percent} />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <HealthItem label="Defender protection" value={device.defender_real_time_protection === null ? "Not reported" : device.defender_real_time_protection ? "On" : "Off"} tone={device.defender_real_time_protection === false ? "warning" : "normal"} />
                      <HealthItem label="Definitions updated" value={device.defender_signatures_updated_at ? formatDateTime(device.defender_signatures_updated_at) : "Not reported"} />
                      <HealthItem label="Restart" value={device.pending_reboot === null ? "Not reported" : device.pending_reboot ? "Required" : "Not required"} tone={device.pending_reboot ? "warning" : "normal"} />
                    </div>
                    <EndpointMonitoringToggle deviceId={device.id} isActive={device.is_active} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#f1f5f9] px-5 py-6 text-sm text-[#64748b]">No devices are enrolled yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-xl bg-[#f1f5f9] px-3 py-2"><p className="text-xs text-[#64748b]">{label}</p><p className="mt-1 text-sm font-semibold text-[#0f766e]">{value === null ? "—" : `${Number(value).toFixed(0)}%`}</p></div>;
}

function HealthItem({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${tone === "warning" ? "bg-amber-50" : "bg-[#f1f5f9]"}`}>
      <p className="text-xs text-[#64748b]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone === "warning" ? "text-amber-900" : "text-[#17263c]"}`}>{value}</p>
    </div>
  );
}

function getStatus(isActive: boolean, lastSeenAt: string | null) {
  if (!isActive) return { label: "Paused", className: "bg-slate-100 text-slate-700" };
  if (!lastSeenAt) return { label: "Waiting", className: "bg-amber-50 text-amber-800" };
  if (Date.now() - new Date(lastSeenAt).getTime() <= 10 * 60 * 1000) return { label: "Online", className: "bg-emerald-50 text-emerald-800" };
  return { label: "Offline", className: "bg-red-50 text-red-800" };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" }).format(new Date(value));
}

function MonitoringLoading() {
  return <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 sm:px-10"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-24 rounded-xl bg-[#e2e8f0]" /><div className="mt-8 h-64 rounded-3xl bg-white" /></div></main>;
}
