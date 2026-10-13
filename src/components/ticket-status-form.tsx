"use client";

import { useActionState } from "react";
import {
  updateTicketStatus,
  type QueueActionState,
} from "@/app/staff/queue/actions";
import { ticketStatusLabel } from "@/lib/helpdesk-labels";

const statuses = ["new", "in_progress", "resolved", "closed"] as const;

export function TicketStatusForm({ ticketId, status }: { ticketId: string; status: string }) {
  const action = updateTicketStatus.bind(null, ticketId);
  const [state, formAction, isPending] = useActionState<QueueActionState, FormData>(action, {});

  return (
    <form action={formAction} className="grid grid-cols-[4rem_10rem_5.25rem] items-center gap-2">
      <label className="text-xs font-medium text-[#64748b]" htmlFor={`status-${ticketId}`}>
        Status
      </label>
      <select
        id={`status-${ticketId}`}
        name="status"
        defaultValue={status}
        className="h-10 w-full min-w-0 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
      >
        {statuses.map((value) => (
          <option value={value} key={value}>
            {ticketStatusLabel(value)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-[#047857] px-2 text-sm font-semibold text-white hover:bg-[#065f46] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
      {state.message && (
        <span role={state.error ? "alert" : "status"} className="col-span-3 text-xs text-[#64748b]">
          {state.message}
        </span>
      )}
    </form>
  );
}
