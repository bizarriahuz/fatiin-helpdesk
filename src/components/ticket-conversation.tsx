"use client";

import { useActionState } from "react";
import {
  sendTicketMessage,
  type MessageActionState,
} from "@/app/staff/tickets/[ticketId]/actions";

type TicketMessage = {
  id: string;
  author_id: string;
  author_email: string;
  body: string;
  created_at: string;
};

export function TicketConversation({
  ticketId,
  currentUserId,
  messages,
  isStaff,
}: {
  ticketId: string;
  currentUserId: string;
  messages: TicketMessage[];
  isStaff: boolean;
}) {
  const action = sendTicketMessage.bind(null, ticketId);
  const [state, formAction, isPending] = useActionState<MessageActionState, FormData>(action, {});

  return (
    <section className="mt-8 border-t border-[#e2e8f0] pt-6">
      <div>
        <h2 className="text-lg font-semibold text-[#17263c]">Conversation</h2>
        <p className="mt-1 text-sm text-[#64748b]">Messages are visible to the requester and helpdesk staff.</p>
      </div>

      {messages.length ? (
        <ol className="mt-5 space-y-3">
          {messages.map((message) => (
            <li key={message.id} className={`rounded-2xl px-4 py-3 ${message.author_id === currentUserId ? "bg-[#ecfdf5]" : "bg-[#f1f5f9]"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#0f766e]">
                  {message.author_id === currentUserId ? "You" : message.author_email}
                </span>
                <time dateTime={message.created_at} className="text-xs text-[#64748b]">
                  {formatDate(message.created_at)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#243449]">{message.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-xl bg-[#f1f5f9] px-4 py-4 text-sm text-[#64748b]">
          No replies yet. Send a reply to add information or ask a question.
        </p>
      )}

      <form action={formAction} className="mt-5 space-y-3">
        <label htmlFor="ticket-message" className="block text-sm font-medium text-[#243449]">
          {isStaff ? "Reply to the requester" : "Reply to the helpdesk"}
        </label>
        <textarea
          id="ticket-message"
          name="message"
          required
          maxLength={4000}
          rows={4}
          placeholder="Write a follow-up message…"
          className="w-full resize-y rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]"
        />
        {state.message && (
          <p role={state.error ? "alert" : "status"} className="text-sm text-[#64748b]">{state.message}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="h-11 rounded-xl bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send reply"}
          </button>
        </div>
      </form>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}
