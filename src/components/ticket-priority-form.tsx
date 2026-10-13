"use client";

import { useActionState } from "react";
import {
  updateTicketPriority,
  type QueueActionState,
} from "@/app/staff/queue/actions";
import { priorityLabel } from "@/lib/helpdesk-labels";

const priorities = ["low", "normal", "high", "urgent"] as const;

export function TicketPriorityForm({ ticketId, priority }: { ticketId: string; priority: string }) {
  const action = updateTicketPriority.bind(null, ticketId);
  const [state, formAction, isPending] = useActionState<QueueActionState, FormData>(action, {});

  return (
    <form action={formAction} className="grid grid-cols-[4rem_10rem_5.25rem] items-center gap-2">
      <label className="text-xs font-medium text-[#64748b]" htmlFor={`priority-${ticketId}`}>Priority</label>
      <select
        id={`priority-${ticketId}`}
        name="priority"
        defaultValue={priority}
        className="h-10 w-full min-w-0 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
      >
        {priorities.map((value) => (
          <option value={value} key={value}>{priorityLabel(value)}</option>
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
