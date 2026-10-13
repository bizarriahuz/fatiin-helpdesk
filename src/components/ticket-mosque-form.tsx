"use client";

import { useActionState } from "react";
import { updateTicketMosque, type TicketMosqueActionState } from "@/app/staff/tickets/[ticketId]/mosque-actions";

export function TicketMosqueForm({ ticketId, mosque, clientNames }: { ticketId: string; mosque: string; clientNames: string[] }) {
  const action = updateTicketMosque.bind(null, ticketId);
  const [state, formAction, isPending] = useActionState<TicketMosqueActionState, FormData>(action, {});

  return (
    <form action={formAction} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <label className="sr-only" htmlFor={`ticket-mosque-${ticketId}`}>Mosque or client site</label>
      <select
        id={`ticket-mosque-${ticketId}`}
        name="mosque"
        required
        defaultValue={mosque}
        disabled={!clientNames.length}
        className="h-10 w-full min-w-0 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
      >
        {clientNames.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <button type="submit" disabled={isPending || !clientNames.length} className="h-10 rounded-lg bg-[#047857] px-3 text-sm font-semibold text-white hover:bg-[#065f46] disabled:opacity-60">
        {isPending ? "Saving…" : "Save"}
      </button>
      {!clientNames.length && <span className="col-span-2 text-xs text-[#64748b]">The site list is empty. Add a site before changing this request.</span>}
      {state.message && <span role={state.error ? "alert" : "status"} className="col-span-2 text-xs text-[#64748b]">{state.message}</span>}
    </form>
  );
}
