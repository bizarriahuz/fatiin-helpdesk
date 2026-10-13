"use client";

import { useActionState, type ReactNode } from "react";
import {
  createAsset,
  updateAssetDetails,
  updateAssetStatus,
  type AssetActionState,
} from "@/app/staff/assets/actions";
import { linkTicketAsset, type TicketAssetActionState } from "@/app/staff/tickets/[ticketId]/asset-actions";

const categories = [
  ["audio_visual", "Audio or video"],
  ["network_wifi", "Network or Wi-Fi"],
  ["computer_device", "Computer"],
  ["printer", "Printer"],
  ["other", "Other"],
] as const;

const statuses = [
  ["available", "Available"],
  ["in_use", "In use"],
  ["in_repair", "In repair"],
  ["retired", "Retired"],
] as const;

export function CreateAssetForm({ clientNames, clientDirectoryError }: { clientNames: string[]; clientDirectoryError: boolean }) {
  const [state, formAction, isPending] = useActionState<AssetActionState, FormData>(createAsset, {});

  return (
    <form action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Asset tag" id="asset-tag">
        <input id="asset-tag" name="asset_tag" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,63}" placeholder="e.g. AV-001" className={inputClass} />
      </Field>
      <Field label="Name" id="asset-name">
        <input id="asset-name" name="name" required minLength={2} maxLength={120} placeholder="Projector, laptop, router…" className={inputClass} />
      </Field>
      <Field label="Mosque or client site" id="asset-mosque">
        <select id="asset-mosque" name="mosque" required defaultValue="" disabled={!clientNames.length} className={inputClass}>
          <option value="" disabled>Select a mosque or client</option>
          {clientNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        {clientDirectoryError ? (
          <p role="alert" className="mt-2 text-xs text-red-700">The site list is unavailable. Apply migration 012.</p>
        ) : !clientNames.length ? (
          <p className="mt-2 text-xs text-[#64748b]">Add a mosque or client site first.</p>
        ) : null}
      </Field>
      <Field label="Category" id="asset-category">
        <select id="asset-category" name="category" required defaultValue="" className={inputClass}>
          <option value="" disabled>Select a type</option>
          {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Status" id="asset-status">
        <select id="asset-status" name="status" defaultValue="available" className={inputClass}>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Location" id="asset-location">
        <input id="asset-location" name="location" maxLength={160} placeholder="e.g. Main prayer hall" className={inputClass} />
      </Field>
      <Field label="Notes" id="asset-notes">
        <input id="asset-notes" name="notes" maxLength={1000} placeholder="Optional details" className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
        <button type="submit" disabled={isPending || !clientNames.length || clientDirectoryError} className="h-11 rounded-xl bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46] disabled:cursor-wait disabled:opacity-60">
          {isPending ? "Saving…" : "Add asset"}
        </button>
        {state.message && <p role={state.error ? "alert" : "status"} className="text-sm text-[#64748b]">{state.message}</p>}
      </div>
    </form>
  );
}

export function AssetStatusForm({ assetId, status }: { assetId: string; status: string }) {
  const action = updateAssetStatus.bind(null, assetId);
  const [state, formAction, isPending] = useActionState<AssetActionState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <label className="text-xs font-medium text-[#64748b]" htmlFor={`asset-status-${assetId}`}>Status</label>
      <select id={`asset-status-${assetId}`} name="status" defaultValue={status} className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
        {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="submit" disabled={isPending} className="h-10 rounded-lg bg-[#047857] px-3 text-sm font-semibold text-white hover:bg-[#065f46] disabled:opacity-60">
        {isPending ? "Saving…" : "Save"}
      </button>
      {state.message && <span role={state.error ? "alert" : "status"} className="w-full text-xs text-[#64748b]">{state.message}</span>}
    </form>
  );
}

export function EditAssetForm({
  asset,
  clientNames,
}: {
  asset: {
    id: string;
    asset_tag: string;
    name: string;
    mosque: string;
    category: string;
    location: string | null;
    notes: string | null;
  };
  clientNames: string[];
}) {
  const action = updateAssetDetails.bind(null, asset.id);
  const [state, formAction, isPending] = useActionState<AssetActionState, FormData>(action, {});

  return (
    <details className="mt-4">
      <summary className="w-fit cursor-pointer text-sm font-medium text-[#0f766e] hover:underline">Edit details</summary>
      <form action={formAction} className="mt-4 grid gap-3 rounded-2xl bg-[#f8fafc] p-4 sm:grid-cols-2">
        <Field label="Asset tag" id={`edit-asset-tag-${asset.id}`}>
          <input id={`edit-asset-tag-${asset.id}`} name="asset_tag" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,63}" defaultValue={asset.asset_tag} className={inputClass} />
        </Field>
        <Field label="Name" id={`edit-asset-name-${asset.id}`}>
          <input id={`edit-asset-name-${asset.id}`} name="name" required minLength={2} maxLength={120} defaultValue={asset.name} className={inputClass} />
        </Field>
        <Field label="Mosque or client site" id={`edit-asset-mosque-${asset.id}`}>
          <select id={`edit-asset-mosque-${asset.id}`} name="mosque" required defaultValue={asset.mosque} className={inputClass}>
            {clientNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </Field>
        <Field label="Category" id={`edit-asset-category-${asset.id}`}>
          <select id={`edit-asset-category-${asset.id}`} name="category" required defaultValue={asset.category === "account_access" ? "other" : asset.category} className={inputClass}>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Location" id={`edit-asset-location-${asset.id}`}>
          <input id={`edit-asset-location-${asset.id}`} name="location" maxLength={160} defaultValue={asset.location ?? ""} className={inputClass} />
        </Field>
        <Field label="Notes" id={`edit-asset-notes-${asset.id}`}>
          <input id={`edit-asset-notes-${asset.id}`} name="notes" maxLength={1000} defaultValue={asset.notes ?? ""} className={inputClass} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={isPending} className="h-10 rounded-lg bg-[#047857] px-4 text-sm font-semibold text-white hover:bg-[#065f46] disabled:opacity-60">
            {isPending ? "Saving…" : "Save details"}
          </button>
          {state.message && <span role={state.error ? "alert" : "status"} className="text-xs text-[#64748b]">{state.message}</span>}
        </div>
      </form>
    </details>
  );
}

export function TicketAssetLinkForm({
  ticketId,
  assetId,
  assets,
}: {
  ticketId: string;
  assetId: string | null;
  assets: Array<{ id: string; asset_tag: string; name: string; mosque: string }>;
}) {
  const action = linkTicketAsset.bind(null, ticketId);
  const [state, formAction, isPending] = useActionState<TicketAssetActionState, FormData>(action, {});

  return (
    <form action={formAction} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <label className="sr-only" htmlFor={`ticket-asset-${ticketId}`}>Asset</label>
      <select
        id={`ticket-asset-${ticketId}`}
        name="asset_id"
        defaultValue={assetId ?? ""}
        className="h-10 w-full min-w-0 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
      >
        <option value="">No linked asset</option>
        {assets.map((asset) => (
          <option value={asset.id} key={asset.id}>{asset.asset_tag} · {asset.name} · {asset.mosque}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-lg bg-[#047857] px-3 text-sm font-semibold text-white hover:bg-[#065f46] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save link"}
      </button>
      {!assets.length && <span className="col-span-2 text-xs text-[#64748b]">No assets are listed for this site yet.</span>}
      {state.message && <span role={state.error ? "alert" : "status"} className="col-span-2 text-xs text-[#64748b]">{state.message}</span>}
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]";
