"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createTicketFromEndpointAlert, type EndpointAlertTicketState } from "@/app/staff/monitoring/actions";

export function EndpointAlertTicketButton({ alertId, ticketId }: { alertId: string; ticketId: string | null }) {
  const action = createTicketFromEndpointAlert.bind(null, alertId);
  const [state, formAction, isPending] = useActionState<EndpointAlertTicketState, FormData>(action, {});
  const linkedTicketId = state.ticketId ?? ticketId;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {linkedTicketId ? (
        <Link href={`/staff/tickets/${linkedTicketId}`} className="text-sm font-semibold text-[#0f766e] underline-offset-4 hover:underline">
          Open ticket
        </Link>
      ) : (
        <form action={formAction}>
          <button type="submit" disabled={isPending} className="h-9 rounded-lg bg-[#047857] px-3 text-xs font-semibold text-white transition hover:bg-[#065f46] disabled:cursor-wait disabled:opacity-60">
            {isPending ? "Creating…" : "Create ticket"}
          </button>
        </form>
      )}
      {state.message && <span role={state.error ? "alert" : "status"} className={`text-xs ${state.error ? "text-red-800" : "text-[#64748b]"}`}>{state.message}</span>}
    </div>
  );
}
