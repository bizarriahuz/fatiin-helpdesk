"use client";

import { useActionState } from "react";
import { updateTicketType, type QueueActionState } from "@/app/staff/queue/actions";

const ticketTypes = [
  ["incident", "Incident"],
  ["problem", "Problem"],
  ["request", "Request"],
  ["change", "Change"],
] as const;

export function TicketTypeForm({ ticketId, ticketType }: { ticketId: string; ticketType: string }) {
  const action = updateTicketType.bind(null, ticketId);
  const [state, formAction, isPending] = useActionState<QueueActionState, FormData>(action, {});

  return (
    <form action={formAction} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <label className="sr-only" htmlFor={`ticket-type-${ticketId}`}>Type</label>
      <select id={`ticket-type-${ticketId}`} name="ticket_type" defaultValue={ticketType} className="h-10 w-full min-w-0 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
        {ticketTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="submit" disabled={isPending} className="h-10 rounded-lg bg-[#047857] px-3 text-sm font-semibold text-white hover:bg-[#065f46] disabled:opacity-60">
        {isPending ? "Saving…" : "Save"}
      </button>
      {state.message && <span role={state.error ? "alert" : "status"} className="col-span-2 text-xs text-[#64748b]">{state.message}</span>}
    </form>
  );
}
