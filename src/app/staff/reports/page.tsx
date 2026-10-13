import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PrintReportButton } from "@/components/print-report-button";
import { createClient } from "@/lib/supabase/server";
import { assetStatusLabel, deviceStatusLabel, priorityLabel, ticketCategoryLabel, ticketStatusLabel, ticketTypeLabel } from "@/lib/helpdesk-labels";

type SearchParams = Promise<{ month?: string | string[]; mosque?: string | string[] }>;
type ReportTicket = { id: string; subject: string; mosque: string; ticket_type: string; category: string; priority: string; status: string; created_at: string };
type ReportAsset = { mosque: string; status: string };
type ReportDevice = { client_name: string; is_active: boolean; last_seen_at: string | null };

export default function StaffReportsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<ReportsLoading />}><StaffReportsContent searchParams={searchParams} /></Suspense>;
}

async function StaffReportsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const rawMonth = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = isValidMonth(rawMonth) ? rawMonth : getCurrentMonth();
  const rawMosque = Array.isArray(params.mosque) ? params.mosque[0] : params.mosque;
  const mosque = rawMosque?.trim().slice(0, 160) ?? "";
  const { start, end } = monthRange(month);
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") redirect("/");

  const { data: membership, error: membershipError } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError || !membership) redirect("/staff");

  const tickets: ReportTicket[] = [];
  let ticketsError = false;
  for (let offset = 0; ; offset += 1000) {
    let query = supabase
      .from("tickets")
      .select("id, subject, mosque, ticket_type, category, priority, status, created_at")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .range(offset, offset + 999);
    if (mosque) query = query.ilike("mosque", `%${escapeLike(mosque)}%`);
    const { data, error } = await query;
    if (error) {
      ticketsError = true;
      break;
    }
    tickets.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const assets: ReportAsset[] = [];
  let assetsError = false;
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from("assets").select("mosque, status").order("mosque").range(offset, offset + 999);
    if (mosque) query = query.ilike("mosque", `%${escapeLike(mosque)}%`);
    const { data, error } = await query;
    if (error) {
      assetsError = true;
      break;
    }
    assets.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const devices: ReportDevice[] = [];
  let devicesError = false;
  for (let offset = 0; ; offset += 1000) {
    let query = supabase
      .from("endpoint_devices")
      .select("client_name, is_active, last_seen_at")
      .order("client_name")
      .range(offset, offset + 999);
    if (mosque) query = query.ilike("client_name", `%${escapeLike(mosque)}%`);
    const { data, error } = await query;
    if (error) {
      devicesError = true;
      break;
    }
    devices.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const ticketMosques = countBy(tickets, (ticket) => ticket.mosque);
  const assetMosques = countBy(assets, (asset) => asset.mosque);
  const categoryCounts = countBy(tickets, (ticket) => ticketCategoryLabel(ticket.category));
  const typeCounts = countBy(tickets, (ticket) => ticketTypeLabel(ticket.ticket_type));
  const priorityCounts = countBy(tickets, (ticket) => priorityLabel(ticket.priority));
  const statusCounts = countBy(tickets, (ticket) => ticketStatusLabel(ticket.status));
  const assetStatusCounts = countBy(assets, (asset) => assetStatusLabel(asset.status));
  const deviceStatusCounts = countBy(devices, (device) => deviceStatusLabel(endpointStatus(device.is_active, device.last_seen_at)));
  const onlineDevices = devices.filter((device) => endpointStatus(device.is_active, device.last_seen_at) === "online").length;
  const openTickets = tickets.filter((ticket) => ticket.status === "new" || ticket.status === "in_progress").length;
  const highPriorityTickets = tickets.filter((ticket) => ticket.priority === "high" || ticket.priority === "urgent").length;

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] print:bg-white print:px-0 print:py-0 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mt-6 flex flex-col gap-4 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-end sm:justify-between print:mt-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Fatiin Multimedia</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17263c]">Monthly report</h1>
            <p className="mt-2 text-sm text-[#64748b]">See ticket activity, assets, and device status for each customer site.</p>
          </div>
          <PrintReportButton />
        </header>

        <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-[#e2e8f0] bg-white p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end print:hidden">
          <div>
            <label htmlFor="report-month" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">Report month</label>
            <input id="report-month" name="month" type="month" required defaultValue={month} className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]" />
          </div>
          <div>
            <label htmlFor="report-mosque" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#64748b]">Mosque or client site</label>
            <input id="report-mosque" name="mosque" type="search" maxLength={160} defaultValue={mosque} placeholder="All sites" className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]" />
          </div>
          <button type="submit" className="h-11 rounded-xl bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46]">Run report</button>
          <Link href="/staff/reports" className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-[#0f766e] hover:bg-[#f1f5f9]">Clear</Link>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#17263c]">{formatMonth(month)}{mosque ? ` · ${mosque}` : " · All sites"}</h2>
          <p className="text-xs text-[#64748b]">Ticket totals use the selected month. Asset and device counts show the current list.</p>
        </div>

        {ticketsError ? (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">We couldn&apos;t load ticket data. Check that migration 011 has been applied.</p>
        ) : (
          <>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Monthly ticket summary">
              <MetricCard label="Tickets received" count={tickets.length} />
              <MetricCard label="Active tickets" count={openTickets} detail="Open or in progress" />
              <MetricCard label="High and critical tickets" count={highPriorityTickets} />
              <MetricCard label="Assets in scope" count={assetsError ? null : assets.length} detail="Current list" />
              <MetricCard label="Monitored devices" count={devicesError ? null : devices.length} detail="Current list" />
              <MetricCard label="Online devices" count={devicesError ? null : onlineDevices} detail="Checked in within 10 minutes" />
            </section>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <ReportTable title="Tickets by site" rows={ticketMosques} empty="No tickets were submitted in this period." />
              <ReportTable title="Current assets by site" rows={assetMosques} empty="No assets match this site filter." error={assetsError ? "Asset data could not be loaded." : undefined} />
              <ReportTable title="Tickets by status" rows={statusCounts} empty="No tickets were submitted in this period." />
              <ReportTable title="Tickets by type" rows={typeCounts} empty="No tickets were submitted in this period." />
              <ReportTable title="Tickets by category" rows={categoryCounts} empty="No tickets were submitted in this period." />
              <ReportTable title="Tickets by priority" rows={priorityCounts} empty="No tickets were submitted in this period." />
              <ReportTable title="Current assets by status" rows={assetStatusCounts} empty="No assets match this site filter." error={assetsError ? "Asset data could not be loaded." : undefined} />
              <ReportTable title="Current devices by status" rows={deviceStatusCounts} empty="No devices match this site filter." error={devicesError ? "Monitoring data is unavailable. Apply migration 013 to include device reporting." : undefined} />
            </div>
            <p className="mt-6 text-xs text-[#64748b]">Tickets are counted by the date they were submitted. Asset and device totals show the current list. Use Print / Save PDF to export this report.</p>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ label, count, detail }: { label: string; count: number | null; detail?: string }) {
  return (
    <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#64748b]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#17263c]">{count ?? "—"}</p>
      {detail && <p className="mt-1 text-xs text-[#64748b]">{detail}</p>}
    </article>
  );
}

function ReportTable({ title, rows, empty, error }: { title: string; rows: Map<string, number>; empty: string; error?: string }) {
  const sortedRows = [...rows].sort(([firstName], [secondName]) => firstName.localeCompare(secondName));
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-[#17263c]">{title}</h3>
      {error ? <p className="mt-4 text-sm text-[#64748b]">{error}</p> : sortedRows.length ? (
        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y divide-[#e2e8f0]">
            {sortedRows.map(([label, count]) => (
              <tr key={label}>
                <th scope="row" className="py-2 text-left font-medium text-[#475569]">{label}</th>
                <td className="py-2 text-right font-semibold tabular-nums text-[#17263c]">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="mt-4 text-sm text-[#64748b]">{empty}</p>}
    </section>
  );
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item) || "Unspecified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function endpointStatus(deviceActive: boolean, lastSeenAt: string | null) {
  if (!deviceActive) return "paused";
  if (!lastSeenAt) return "waiting";
  return Date.now() - new Date(lastSeenAt).getTime() <= 10 * 60 * 1000 ? "online" : "offline";
}

function isValidMonth(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.split("-")[1]);
  return month >= 1 && month <= 12;
}

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const singaporeOffsetMs = 8 * 60 * 60 * 1000;
  return {
    start: new Date(Date.UTC(year, monthIndex - 1, 1) - singaporeOffsetMs).toISOString(),
    end: new Date(Date.UTC(year, monthIndex, 1) - singaporeOffsetMs).toISOString(),
  };
}

function formatMonth(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-SG", { month: "long", year: "numeric", timeZone: "Asia/Singapore" })
    .format(new Date(Date.UTC(year, monthIndex - 1, 1, 12)));
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function ReportsLoading() {
  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-24 rounded-xl bg-[#e2e8f0]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 rounded-2xl bg-white" />
          <div className="h-28 rounded-2xl bg-white" />
          <div className="h-28 rounded-2xl bg-white" />
          <div className="h-28 rounded-2xl bg-white" />
        </div>
      </div>
    </main>
  );
}
