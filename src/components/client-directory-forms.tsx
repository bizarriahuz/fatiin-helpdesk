"use client";

import { useActionState } from "react";
import {
  createHelpdeskClient,
  renameHelpdeskClient,
  type ClientActionState,
} from "@/app/staff/clients/actions";

export function CreateClientForm() {
  const [state, formAction, isPending] = useActionState<ClientActionState, FormData>(createHelpdeskClient, {});
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <label htmlFor="new-client-name" className="sr-only">New mosque or client site</label>
      <input id="new-client-name" name="name" required minLength={2} maxLength={160} placeholder="Enter a mosque or client site" className="h-11 min-w-0 flex-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]" />
      <button type="submit" disabled={isPending} className="h-11 rounded-xl bg-[#047857] px-5 text-sm font-semibold text-white hover:bg-[#065f46] disabled:opacity-60">
        {isPending ? "Adding…" : "Add site"}
      </button>
      {state.message && <p role={state.error ? "alert" : "status"} className="self-center text-sm text-[#64748b]">{state.message}</p>}
    </form>
  );
}

export function RenameClientForm({ client }: { client: { id: string; name: string } }) {
  const action = renameHelpdeskClient.bind(null, client.id);
  const [state, formAction, isPending] = useActionState<ClientActionState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor={`client-name-${client.id}`}>Mosque or client site</label>
      <input id={`client-name-${client.id}`} name="name" required minLength={2} maxLength={160} defaultValue={client.name} className="h-10 min-w-48 flex-1 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]" />
      <button type="submit" disabled={isPending} className="h-10 rounded-lg bg-[#ecfdf5] px-3 text-sm font-semibold text-[#0f766e] hover:bg-[#dfeadd] disabled:opacity-60">
        {isPending ? "Saving…" : "Rename"}
      </button>
      {state.message && <span role={state.error ? "alert" : "status"} className="w-full text-xs text-[#64748b]">{state.message}</span>}
    </form>
  );
}
