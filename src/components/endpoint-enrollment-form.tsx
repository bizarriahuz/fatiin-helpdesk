"use client";

import { useActionState } from "react";
import { enrollEndpoint, type EnrollmentState } from "@/app/staff/monitoring/actions";
import { setEndpointActive } from "@/app/staff/monitoring/actions";

type EnrollmentAsset = { id: string; asset_tag: string; name: string; mosque: string };

export function EndpointEnrollmentForm({ assets, configured }: { assets: EnrollmentAsset[]; configured: boolean }) {
  const [state, formAction, isPending] = useActionState<EnrollmentState, FormData>(enrollEndpoint, {});

  return (
    <form action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Asset" id="monitoring-asset">
        <select id="monitoring-asset" name="asset_id" required defaultValue="" disabled={!assets.length} className={inputClass}>
          <option value="" disabled>Select an asset</option>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.asset_tag} · {asset.name} · {asset.mosque}</option>)}
        </select>
        {!assets.length && <p className="mt-2 text-xs text-[#64748b]">Register an asset first.</p>}
      </Field>
      <Field label="Device name" id="monitoring-hostname">
        <input id="monitoring-hostname" name="hostname" required maxLength={255} placeholder="e.g. office-laptop-01" className={inputClass} />
      </Field>
      <Field label="Operating system" id="monitoring-os">
        <input id="monitoring-os" name="operating_system" required maxLength={80} placeholder="e.g. Windows 11" className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <div className="flex justify-end">
          <button type="submit" disabled={isPending || !assets.length || !configured} className="h-11 rounded-xl bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46] disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? "Enrolling…" : "Enroll device"}
          </button>
        </div>
        {!configured && <p className="mt-2 text-xs text-[#64748b]">Set the server-side Supabase service role key before enrolling devices.</p>}
        {state.message && <p role={state.error ? "alert" : "status"} className={`mt-3 text-sm ${state.error ? "text-red-800" : "text-[#0f766e]"}`}>{state.message}</p>}
        {state.deviceId && state.token && (
          <div className="mt-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <p className="text-sm font-semibold text-[#17263c]">Save these enrollment details now</p>
            <p className="mt-3 text-xs font-medium text-[#64748b]">Device ID</p>
            <code className="mt-1 block break-all rounded-lg bg-white p-3 text-sm text-[#0f766e]">{state.deviceId}</code>
            <p className="mt-3 text-xs font-medium text-[#64748b]">One-time device token</p>
            <code className="mt-1 block break-all rounded-lg bg-white p-3 text-sm text-[#0f766e]">{state.token}</code>
            <p className="mt-3 text-xs leading-5 text-[#64748b]">Store the token in the device agent&apos;s secure configuration. Fatiin stores only a hash.</p>
          </div>
        )}
      </div>
    </form>
  );
}

export function EndpointMonitoringToggle({ deviceId, isActive }: { deviceId: string; isActive: boolean }) {
  const action = setEndpointActive.bind(null, deviceId);
  const [state, formAction, isPending] = useActionState<EnrollmentState, FormData>(action, {});
  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="is_active" value={isActive ? "false" : "true"} />
      <button type="submit" disabled={isPending} className="h-9 rounded-lg border border-[#e2e8f0] px-3 text-xs font-semibold text-[#0f766e] hover:bg-[#f1f5f9] disabled:opacity-60">
        {isPending ? "Saving…" : isActive ? "Pause monitoring" : "Resume monitoring"}
      </button>
      {state.message && <span role={state.error ? "alert" : "status"} className="text-xs text-[#64748b]">{state.message}</span>}
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="grid gap-2 text-sm font-medium text-[#243449]"><label htmlFor={id}>{label}</label>{children}</div>;
}

const inputClass = "h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm font-normal text-[#0f766e] outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#dbeafe] disabled:opacity-60";
