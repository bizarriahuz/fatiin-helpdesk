import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { TicketStatusForm } from "@/components/ticket-status-form";
import { TicketPriorityForm } from "@/components/ticket-priority-form";
import { TicketAssignmentForm } from "@/components/ticket-assignment-form";
import { createClient } from "@/lib/supabase/server";
import { priorityLabel, ticketCategoryLabel, ticketStatusLabel, ticketTypeLabel } from "@/lib/helpdesk-labels";

type QueueSearchParams = Promise<{
  status?: string | string[];
  category?: string | string[];
  type?: string | string[];
  asset?: string | string[];
  priority?: string | string[];
  assignment?: string | string[];
  mosque?: string | string[];
  q?: string | string[];
}>;

const statuses = ["new", "in_progress", "resolved", "closed"] as const;
const categories = ["hardware", "software", "printer", "network", "email", "ms365"] as const;
const ticketTypes = ["incident", "problem", "request", "change"] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;

export default function StaffQueuePage({ searchParams }: { searchParams: QueueSearchParams }) {
  return (
    <Suspense fallback={<QueueLoading />}>
      <StaffQueueContent searchParams={searchParams} />
    </Suspense>
  );
}

async function StaffQueueContent({ searchParams }: { searchParams: QueueSearchParams }) {
  await connection();
  const params = await searchParams;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
  const typeParam = Array.isArray(params.type) ? params.type[0] : params.type;
  const assetParam = Array.isArray(params.asset) ? params.asset[0] : params.asset;
  const priorityParam = Array.isArray(params.priority) ? params.priority[0] : params.priority;
  const assignmentParam = Array.isArray(params.assignment) ? params.assignment[0] : params.assignment;
  const mosqueParam = Array.isArray(params.mosque) ? params.mosque[0] : params.mosque;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const status = statusParam === "active" ? "active" : statuses.find((value) => value === statusParam) ?? "";
  const category = categories.find((value) => value === categoryParam) ?? "";
  const type = ticketTypes.find((value) => value === typeParam) ?? "";
  const priority = priorities.find((value) => value === priorityParam) ?? "";
  const assignment = assignmentParam === "unassigned" || assignmentParam === "assigned" ? assignmentParam : "";
  const mosque = typeof mosqueParam === "string" ? mosqueParam.trim().slice(0, 160) : "";
  const query = typeof queryParam === "string" ? queryParam.trim().slice(0, 120) : "";
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || typeof claims?.sub !== "string") {
    redirect("/");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/staff");
  }

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("id, asset_tag, name")
    .order("asset_tag")
    .limit(500);
  const assetOptions = assets ?? [];
  const assetId = typeof assetParam === "string" && assetOptions.some((asset) => asset.id === assetParam)
    ? assetParam
    : "";
  const assetById = new Map(assetOptions.map((asset) => [asset.id, asset]));

  let ticketQuery = supabase
    .from("tickets")
    .select("id, requester_email, subject, mosque, ticket_type, category, description, location, status, priority, created_at, assigned_to, asset_id")
    .order("priority_rank", { ascending: true })
    .order("created_at", { ascending: false });
  if (status === "active") ticketQuery = ticketQuery.in("status", ["new", "in_progress"]);
  else if (status) ticketQuery = ticketQuery.eq("status", status);
  if (category) ticketQuery = ticketQuery.eq("category", category);
  if (type) ticketQuery = ticketQuery.eq("ticket_type", type);
  if (assetId) ticketQuery = ticketQuery.eq("asset_id", assetId);
  if (priority) ticketQuery = ticketQuery.eq("priority", priority);
  if (assignment === "unassigned") ticketQuery = ticketQuery.is("assigned_to", null);
  else if (assignment === "assigned") ticketQuery = ticketQuery.not("assigned_to", "is", null);
  if (query) ticketQuery = ticketQuery.ilike("subject", `%${query}%`);
  if (mosque) ticketQuery = ticketQuery.ilike("mosque", `%${mosque.replace(/[\\%_]/g, "\\$&")}%`);
  const { data: tickets, error: ticketsError } = await ticketQuery.limit(100);

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mt-6 flex flex-col gap-3 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
              Fatiin Multimedia
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17263c]">
              Tickets
            </h1>
            <p className="mt-2 text-sm text-[#64748b]">Review tickets, assign them, and update their status.</p>
          </div>
        </header>

        <form method="get" className="mt-6 space-y-4 rounded-2xl border border-[#e2e8f0] bg-white p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="filter-query" className="mb-2 block text-sm font-medium text-[#475569]">Search tickets</label>
              <input id="filter-query" name="q" type="search" maxLength={120} defaultValue={query} placeholder="Search by ticket title" className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]" />
            </div>
            <div>
              <label htmlFor="filter-status" className="mb-2 block text-sm font-medium text-[#475569]">Status</label>
              <select id="filter-status" name="status" defaultValue={status} className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
                <option value="">All statuses</option>
                <option value="active">Active (open and in progress)</option>
                <option value="new">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-type" className="mb-2 block text-sm font-medium text-[#475569]">Type</label>
              <select id="filter-type" name="type" defaultValue={type} className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
                <option value="">All types</option>
                {ticketTypes.map((value) => <option value={value} key={value}>{ticketTypeLabel(value)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filter-priority" className="mb-2 block text-sm font-medium text-[#475569]">Priority</label>
              <select id="filter-priority" name="priority" defaultValue={priority} className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
                <option value="">All priorities</option>
                <option value="urgent">Critical</option>
                <option value="high">High</option>
                <option value="normal">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-mosque" className="mb-2 block text-sm font-medium text-[#475569]">Mosque or client site</label>
              <input id="filter-mosque" name="mosque" type="search" maxLength={160} defaultValue={mosque} placeholder="Search by site name" className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]" />
            </div>
          </div>

          <details className="border-t border-[#e2e8f0] pt-3" open={Boolean(category || assetId || assignment)}>
            <summary className="w-fit cursor-pointer text-sm font-medium text-[#0f766e] marker:text-[#64748b] hover:text-[#047857]">
              More filters <span className="ml-1 text-xs font-normal text-[#64748b]">Category, asset, assignment</span>
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <label htmlFor="filter-category" className="mb-2 block text-sm font-medium text-[#475569]">Category</label>
                <select id="filter-category" name="category" defaultValue={category} className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
                  <option value="">All categories</option>
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="printer">Printer</option>
                  <option value="network">Network</option>
                  <option value="email">Email</option>
                  <option value="ms365">MS365</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-asset" className="mb-2 block text-sm font-medium text-[#475569]">Asset</label>
                <select id="filter-asset" name="asset" defaultValue={assetId} disabled={Boolean(assetsError)} className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] disabled:opacity-60">
                  <option value="">All assets</option>
                  {assetOptions.map((asset) => <option value={asset.id} key={asset.id}>{asset.asset_tag} · {asset.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="filter-assignment" className="mb-2 block text-sm font-medium text-[#475569]">Assignment</label>
                <select id="filter-assignment" name="assignment" defaultValue={assignment} className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
                  <option value="">Any assignment</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="assigned">Assigned</option>
                </select>
              </div>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-2 border-t border-[#e2e8f0] pt-3">
            <button type="submit" className="h-10 rounded-lg bg-[#047857] px-4 text-sm font-semibold text-white transition hover:bg-[#065f46]">Apply filters</button>
            <Link href="/staff/queue" className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-[#0f766e] hover:bg-[#f1f5f9]">Clear</Link>
          </div>
        </form>

        {assetsError && <p className="mt-3 text-sm text-[#64748b]">Asset filters are unavailable. Check the asset list setup.</p>}

        {ticketsError ? (
          <p role="alert" className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            We couldn&apos;t load the queue. Check that the staff triage migration has been applied.
          </p>
        ) : tickets?.length ? (
          <ul className="mt-8 space-y-4">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition duration-150 hover:border-slate-300 hover:shadow-md sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2">
                      <TicketAssignmentForm ticketId={ticket.id} assignedTo={ticket.assigned_to} currentUserId={claims.sub} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        href={`/staff/tickets/${ticket.id}`}
                        className="font-semibold text-[#17263c] hover:text-[#047857] hover:underline"
                      >
                        {ticket.subject}
                      </Link>
                      <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-medium capitalize text-[#0f766e]">
                        {ticketStatusLabel(ticket.status)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${ticket.priority === "urgent" ? "bg-red-100 text-red-800" : ticket.priority === "high" ? "bg-amber-100 text-amber-800" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                        {priorityLabel(ticket.priority)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#64748b]">
                      {ticket.requester_email ?? "Email not available"} · {ticket.mosque} · {ticketTypeLabel(ticket.ticket_type)} · {ticketCategoryLabel(ticket.category)} · {formatDate(ticket.created_at)}
                    </p>
                    {ticket.asset_id && assetById.get(ticket.asset_id) && (
                      <p className="mt-2 text-sm text-[#64748b]">
                        Asset: <Link href={`/staff/assets?q=${encodeURIComponent(assetById.get(ticket.asset_id)?.asset_tag ?? "")}`} className="font-medium text-[#0f766e] hover:underline">
                          {assetById.get(ticket.asset_id)?.asset_tag} · {assetById.get(ticket.asset_id)?.name}
                        </Link>
                      </p>
                    )}
                    {ticket.location && (
                      <p className="mt-3 text-sm text-[#243449]">Location: {ticket.location}</p>
                    )}
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#64748b]">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <TicketPriorityForm ticketId={ticket.id} priority={ticket.priority} />
                    <TicketStatusForm ticketId={ticket.id} status={ticket.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 rounded-2xl bg-white px-5 py-6 text-sm leading-6 text-[#64748b]">
            {query || status || category || type || assetId || priority || assignment || mosque
              ? "No tickets match your search and filters."
              : "There are no tickets yet."}
          </p>
        )}
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

function QueueLoading() {
  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-24 rounded-xl bg-[#e2e8f0]" />
        <div className="mt-8 space-y-4">
          <div className="h-40 rounded-2xl bg-white" />
          <div className="h-40 rounded-2xl bg-white" />
        </div>
      </div>
    </main>
  );
}
