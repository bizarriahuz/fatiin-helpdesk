"use client";

import { useActionState } from "react";
import {
  setTicketAssignment,
  type QueueActionState,
} from "@/app/staff/queue/actions";

export function TicketAssignmentForm({
  ticketId,
  assignedTo,
  currentUserId,
}: {
  ticketId: string;
  assignedTo: string | null;
  currentUserId: string;
}) {
  const assignmentAction = assignedTo === currentUserId ? "release" : "claim";
  const action = setTicketAssignment.bind(null, ticketId, assignmentAction);
  const [state, formAction, isPending] = useActionState<QueueActionState, FormData>(action, {});

  const assignmentLabel = assignedTo === null
    ? "Unassigned"
    : assignedTo === currentUserId
      ? "Assigned to you"
      : "Assigned to another technician";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#64748b]">{assignmentLabel}</span>
      {assignedTo === null || assignedTo === currentUserId ? (
        <form action={formAction}>
          <button
            type="submit"
            disabled={isPending}
            className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#0f766e] hover:bg-[#f1f5f9] disabled:opacity-60"
          >
            {isPending ? "Saving…" : assignmentAction === "claim" ? "Assign to me" : "Unassign ticket"}
          </button>
        </form>
      ) : null}
      {state.message && (
        <span role={state.error ? "alert" : "status"} className="w-full text-xs text-[#64748b]">
          {state.message}
        </span>
      )}
    </div>
  );
}
