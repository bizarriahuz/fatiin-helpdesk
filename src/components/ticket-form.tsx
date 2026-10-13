"use client";

import { useActionState } from "react";
import { createTicket } from "@/app/staff/new/actions";

export function TicketForm({ clientNames, clientDirectoryError }: { clientNames: string[]; clientDirectoryError: boolean }) {
  const [state, formAction, isPending] = useActionState(createTicket, {});

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="subject" className="mb-2 block text-sm font-medium text-[#243449]">
          What do you need help with?
        </label>
        <input
          id="subject"
          name="subject"
          required
          minLength={5}
          maxLength={120}
          placeholder="For example: Projector has no picture"
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]"
        />
      </div>

      <div>
        <label htmlFor="mosque" className="mb-2 block text-sm font-medium text-[#243449]">
          Mosque or client site
        </label>
        <select
          id="mosque"
          name="mosque"
          required
          defaultValue=""
          disabled={!clientNames.length}
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] disabled:opacity-60"
        >
          <option value="" disabled>Select a mosque or client</option>
          {clientNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        {clientDirectoryError ? (
          <p role="alert" className="mt-2 text-xs text-red-700">The site list is unavailable. Ask helpdesk staff for help.</p>
        ) : !clientNames.length ? (
          <p className="mt-2 text-xs text-[#64748b]">No sites are listed yet. Ask helpdesk staff to add one.</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="ticket-type" className="mb-2 block text-sm font-medium text-[#243449]">
          Type
        </label>
        <select id="ticket-type" name="ticket_type" required defaultValue="incident" className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
          <option value="incident">Incident</option>
          <option value="problem">Problem</option>
          <option value="request">Request</option>
          <option value="change">Change</option>
        </select>
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-medium text-[#243449]">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
        >
          <option value="" disabled>
            Select a category
          </option>
          <option value="hardware">Hardware</option>
          <option value="software">Software</option>
          <option value="printer">Printer</option>
          <option value="network">Network</option>
          <option value="email">Email</option>
          <option value="ms365">MS365</option>
        </select>
      </div>

      <div>
        <label htmlFor="priority" className="mb-2 block text-sm font-medium text-[#243449]">
          Priority
        </label>
        <select
          id="priority"
          name="priority"
          defaultValue="normal"
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
        >
          <option value="low">Low — small issue; a workaround is available</option>
          <option value="normal">Medium — routine support</option>
          <option value="high">High — work is seriously affected</option>
          <option value="urgent">Critical — an essential service is down</option>
        </select>
        <p className="mt-2 text-xs text-[#64748b]">The helpdesk may adjust the priority after reviewing the request.</p>
      </div>

      <div>
        <label htmlFor="location" className="mb-2 block text-sm font-medium text-[#243449]">
          Where is the issue? <span className="font-normal text-[#87938a]">(optional)</span>
        </label>
        <input
          id="location"
          name="location"
          maxLength={160}
          placeholder="For example: Main prayer hall"
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-medium text-[#243449]">
          Describe the issue
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder="Tell us what happened and what you have already tried."
          className="w-full resize-y rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]"
        />
      </div>

      <div>
        <label htmlFor="attachment" className="mb-2 block text-sm font-medium text-[#243449]">
          Add a screenshot or document <span className="font-normal text-[#87938a]">(optional)</span>
        </label>
        <input
          id="attachment"
          name="attachment"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#243449] file:mr-4 file:rounded-lg file:border-0 file:bg-[#ecfdf5] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#0f766e]"
        />
        <p className="mt-2 text-xs text-[#64748b]">JPG, PNG, WEBP, or PDF · up to 5 MB</p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !clientNames.length || clientDirectoryError}
          className="h-12 w-full rounded-xl bg-[#047857] text-sm font-semibold text-white transition hover:bg-[#065f46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#047857] disabled:cursor-wait disabled:opacity-65 sm:w-auto sm:px-8"
        >
          {isPending ? "Submitting…" : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}
