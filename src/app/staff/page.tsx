import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { priorityLabel, ticketCategoryLabel, ticketStatusLabel, ticketTypeLabel } from "@/lib/helpdesk-labels";

type StaffPageProps = {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[]; mosque?: string | string[] }>;
};

const REQUEST_STATUSES = ["new", "in_progress", "resolved", "closed"] as const;
type RequestStatus = (typeof REQUEST_STATUSES)[number];

export default function StaffPage({ searchParams }: StaffPageProps) {
  return (
    <Suspense fallback={<StaffPageLoading />}>
      <StaffContent searchParams={searchParams} />
    </Suspense>
  );
}

async function StaffContent({ searchParams }: StaffPageProps) {
  await connection();
  const params = await searchParams;
  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = rawStatus === "active" || REQUEST_STATUSES.includes(rawStatus as RequestStatus)
    ? rawStatus
    : "";
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim().slice(0, 120) ?? "";
  const rawMosque = Array.isArray(params.mosque) ? params.mosque[0] : params.mosque;
  const mosque = rawMosque?.trim().slice(0, 160) ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims) {
    redirect("/");
  }

  const { data: staffMembership } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();

  const teamCounts = staffMembership
    ? await Promise.all([
        supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["new", "in_progress"]),
        supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["new", "in_progress"]).eq("priority", "urgent"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["new", "in_progress"]).is("assigned_to", null),
      ])
    : null;

  let ticketsQuery = supabase
    .from("tickets")
    .select("id, subject, mosque, ticket_type, category, status, priority, created_at")
    .eq("requester_id", claims.sub);

  if (status === "active") {
    ticketsQuery = ticketsQuery.in("status", ["new", "in_progress"]);
  } else if (status) {
    ticketsQuery = ticketsQuery.eq("status", status);
  }
  if (query) {
    ticketsQuery = ticketsQuery.ilike("subject", `%${query.replace(/[\\%_]/g, "\\$&")}%`);
  }
  if (mosque) {
    ticketsQuery = ticketsQuery.ilike("mosque", `%${mosque.replace(/[\\%_]/g, "\\$&")}%`);
  }

  const { data: tickets, error: ticketsError } = await ticketsQuery
    .order("created_at", { ascending: false })
    .limit(20);

  const ticketIds = tickets?.map((ticket) => ticket.id) ?? [];
  const { data: latestMessages } = ticketIds.length
    ? await supabase
        .from("ticket_messages")
        .select("ticket_id, body, author_email, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };
  const latestMessageByTicket = new Map(
    (latestMessages ?? []).map((message) => [message.ticket_id, message]),
  );
  const activitySortedTickets = [...(tickets ?? [])].sort((first, second) => {
    const firstActivity = latestMessageByTicket.get(first.id)?.created_at ?? first.created_at;
    const secondActivity = latestMessageByTicket.get(second.id)?.created_at ?? second.created_at;
    return new Date(secondActivity).getTime() - new Date(firstActivity).getTime();
  });

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
              Fatiin Multimedia
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17263c]">Dashboard</h1>
          </div>
        </header>

        <section className="mt-10 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm text-[#64748b]">You are signed in as</p>
          <p className="mt-1 font-medium text-[#17263c]">
            {typeof claims.email === "string" ? claims.email : "Staff member"}
          </p>
        </section>

        {staffMembership && teamCounts && (
          <section className="mt-8" aria-labelledby="team-overview-heading">
            <h2 id="team-overview-heading" className="mb-4 text-lg font-semibold text-[#17263c]">Team overview</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <WorkloadCard href="/staff/queue?status=active" label="Active tickets" count={teamCounts[0].count} detail="Open or in progress" />
              <WorkloadCard href="/staff/queue?status=active&priority=urgent" label="Critical tickets" count={teamCounts[1].count} detail="Need prompt attention" urgent />
              <WorkloadCard href="/staff/queue?status=active&assignment=unassigned" label="Unassigned" count={teamCounts[2].count} detail="No staff member assigned" />
            </div>
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#17263c]">My tickets</h2>
              <p className="mt-1 text-sm text-[#64748b]">Only you can see the tickets you submitted.</p>
            </div>
            <Link
              href="/staff/new"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46]"
            >
              New ticket
            </Link>
          </div>

          <form action="/staff" method="get" className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto]">
            <label className="sr-only" htmlFor="request-search">Search your tickets</label>
            <input
              id="request-search"
              name="q"
              type="search"
              maxLength={120}
              defaultValue={query}
              placeholder="Search tickets"
              className="h-11 rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition placeholder:text-[#64748b] focus:border-[#0f766e] focus:ring-2 focus:ring-[#dbeafe]"
            />
            <label className="sr-only" htmlFor="request-mosque">Filter by site</label>
            <input
              id="request-mosque"
              name="mosque"
              type="search"
              maxLength={160}
              defaultValue={mosque}
              placeholder="Filter by site"
              className="h-11 rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition placeholder:text-[#64748b] focus:border-[#0f766e] focus:ring-2 focus:ring-[#dbeafe]"
            />
            <label className="sr-only" htmlFor="request-status">Filter by status</label>
            <select
              id="request-status"
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm capitalize outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#dbeafe]"
            >
              <option value="">All statuses</option>
              <option value="active">Active (new or in progress)</option>
              {REQUEST_STATUSES.map((value) => (
                <option key={value} value={value}>{ticketStatusLabel(value)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="h-11 rounded-xl bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46]">Search</button>
              {(query || status || mosque) && <Link href="/staff" className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-[#0f766e] hover:bg-[#f1f5f9]">Clear</Link>}
            </div>
          </form>

          {ticketsError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              We couldn&apos;t load your tickets. Check that the helpdesk database setup has been applied.
            </p>
          ) : activitySortedTickets.length ? (
            <ul className="mt-6 divide-y divide-[#e2e8f0]">
              {activitySortedTickets.map((ticket) => {
                const latestMessage = latestMessageByTicket.get(ticket.id);
                return (
                <li key={ticket.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link
                      href={`/staff/tickets/${ticket.id}`}
                      className="font-medium text-[#0f766e] hover:text-[#047857] hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                    <p className="mt-1 text-sm text-[#64748b]">
                      {ticket.mosque} · {ticketTypeLabel(ticket.ticket_type)} · {ticketCategoryLabel(ticket.category)} · {formatDate(ticket.created_at)}
                    </p>
                    {latestMessage && (
                      <p className="mt-2 max-w-xl text-sm text-[#64748b]">
                        <span className="font-medium text-[#0f766e]">
                          Latest reply · {formatDate(latestMessage.created_at)}
                          {latestMessage.author_email === claims.email ? " · You" : ""}
                        </span>
                        <span className="mt-1 block">{latestMessage.body.slice(0, 180)}{latestMessage.body.length > 180 ? "…" : ""}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="w-fit rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-medium capitalize text-[#0f766e]">
                      {ticketStatusLabel(ticket.status)}
                    </span>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${ticket.priority === "urgent" ? "bg-red-50 text-red-700" : ticket.priority === "high" ? "bg-amber-50 text-amber-800" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                      {priorityLabel(ticket.priority)} priority
                    </span>
                  </div>
                </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl bg-[#f1f5f9] px-5 py-6 text-sm leading-6 text-[#64748b]">
              {query || status || mosque
                ? "No tickets match those filters. Try another search or clear the filters."
                : <>You haven&apos;t submitted a ticket yet. Use <span className="font-medium">New ticket</span> when something needs attention.</>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function WorkloadCard({
  href,
  label,
  count,
  detail,
  urgent = false,
}: {
  href: string;
  label: string;
  count: number | null;
  detail: string;
  urgent?: boolean;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition duration-150 hover:border-emerald-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
      <p className="text-sm font-medium text-[#64748b]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${urgent ? "text-red-700" : "text-[#17263c]"}`}>{count ?? "—"}</p>
      <p className="mt-1 text-xs text-[#64748b]">{detail}</p>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

function StaffPageLoading() {
  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] sm:px-10">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="h-16 rounded-xl bg-[#e2e8f0]" />
        <div className="mt-10 h-48 rounded-3xl bg-white" />
      </div>
    </main>
  );
}
