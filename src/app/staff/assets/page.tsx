import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AssetStatusForm, CreateAssetForm, EditAssetForm } from "@/components/asset-forms";
import { createClient } from "@/lib/supabase/server";
import { assetCategoryLabel, ticketStatusLabel } from "@/lib/helpdesk-labels";

type SearchParams = Promise<{ q?: string | string[]; mosque?: string | string[] }>;

export default function AssetsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AssetsLoading />}>
      <AssetsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AssetsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const mosqueParam = Array.isArray(params.mosque) ? params.mosque[0] : params.mosque;
  const query = typeof queryParam === "string" ? queryParam.trim().slice(0, 80) : "";
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

  const { data: clients, error: clientsError } = await supabase
    .from("helpdesk_clients")
    .select("name")
    .order("name");

  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, asset_tag, name, mosque, category, location, status, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const mosqueOptions = [...new Set((assets ?? []).map((asset) => asset.mosque))].sort((a, b) => a.localeCompare(b));
  const mosque = typeof mosqueParam === "string" && mosqueOptions.includes(mosqueParam) ? mosqueParam : "";
  const filteredAssets = (assets ?? []).filter((asset) => {
    const matchesQuery = !query || `${asset.asset_tag} ${asset.name} ${asset.mosque}`.toLowerCase().includes(query.toLowerCase());
    const matchesMosque = !mosque || asset.mosque === mosque;
    return matchesQuery && matchesMosque;
  });
  const assetIds = filteredAssets?.map((asset) => asset.id) ?? [];
  let linkedTickets: Array<{ id: string; asset_id: string | null; subject: string; mosque: string; status: string; created_at: string }> = [];
  let linkedTicketsError = false;
  if (assetIds.length) {
    const result = await supabase
      .from("tickets")
      .select("id, asset_id, subject, mosque, status, created_at")
      .in("asset_id", assetIds)
      .order("created_at", { ascending: false })
      .limit(500);
    linkedTickets = result.data ?? [];
    linkedTicketsError = Boolean(result.error);
  }
  const recentTicketsByAsset = new Map<string, typeof linkedTickets>();
  for (const ticket of linkedTickets) {
    if (!ticket.asset_id) continue;
    const assetTickets = recentTicketsByAsset.get(ticket.asset_id) ?? [];
    if (assetTickets.length < 3) {
      assetTickets.push(ticket);
      recentTicketsByAsset.set(ticket.asset_id, assetTickets);
    }
  }

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mt-6 border-b border-[#e2e8f0] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Fatiin Multimedia</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17263c]">Assets</h1>
          <p className="mt-2 text-sm text-[#64748b]">Track assets at each mosque or client site.</p>
        </header>

        <section className="mt-8 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-[#17263c]">Add asset</h2>
          <CreateAssetForm clientNames={(clients ?? []).map((client) => client.name)} clientDirectoryError={Boolean(clientsError)} />
        </section>

        <section className="mt-8 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#17263c]">Asset list</h2>
              <p className="mt-1 text-sm text-[#64748b]">Search by asset tag or name, or filter by site.</p>
            </div>
            <form method="get" className="flex w-full flex-wrap gap-2 sm:max-w-2xl">
              <label className="sr-only" htmlFor="asset-search">Search assets</label>
              <input id="asset-search" name="q" type="search" maxLength={80} defaultValue={query} placeholder="Search tag or name" className="h-11 min-w-0 flex-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]" />
              <label className="sr-only" htmlFor="asset-mosque-filter">Filter by mosque or client site</label>
              <select id="asset-mosque-filter" name="mosque" defaultValue={mosque} className="h-11 min-w-48 flex-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#243449] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]">
                <option value="">All sites</option>
                {mosqueOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <button type="submit" className="h-11 rounded-xl bg-[#047857] px-4 text-sm font-semibold text-white hover:bg-[#065f46]">Search</button>
              {(query || mosque) && <Link href="/staff/assets" className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-[#0f766e] hover:bg-[#f1f5f9]">Clear</Link>}
            </form>
          </div>

          {error ? (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">We couldn&apos;t load the equipment list. Check that migrations 006 and 014 have been applied.</p>
          ) : filteredAssets?.length ? (
            <ul className="mt-6 divide-y divide-[#e2e8f0]">
              {filteredAssets.map((asset) => (
                <li key={asset.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{asset.asset_tag}</p>
                    <h3 className="mt-1 font-semibold text-[#17263c]">{asset.name}</h3>
                    <p className="mt-1 text-sm font-medium text-[#0f766e]">{asset.mosque}</p>
                    <p className="mt-1 text-sm text-[#64748b]">{assetCategoryLabel(asset.category)}{asset.location ? ` · ${asset.location}` : ""}</p>
                    {asset.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#64748b]">{asset.notes}</p>}
                    <EditAssetForm asset={asset} clientNames={(clients ?? []).map((client) => client.name)} />
                    {linkedTicketsError ? (
                      <p className="mt-3 text-xs text-[#64748b]">Request history could not be loaded.</p>
                    ) : recentTicketsByAsset.has(asset.id) ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Recent tickets</p>
                        <ul className="mt-2 space-y-1">
                          {recentTicketsByAsset.get(asset.id)?.map((ticket) => (
                            <li key={ticket.id}>
                              <Link href={`/staff/tickets/${ticket.id}`} className="text-sm text-[#0f766e] hover:underline">
                                {ticket.subject} <span className="text-[#64748b]">· {ticket.mosque} · {ticketStatusLabel(ticket.status)} · {formatDate(ticket.created_at)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  <AssetStatusForm assetId={asset.id} status={asset.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-2xl bg-[#f1f5f9] px-5 py-6 text-sm leading-6 text-[#64748b]">
              {query || mosque ? "No assets match those filters." : "No assets are listed yet. Add the first one above."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

function AssetsLoading() {
  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-24 rounded-xl bg-[#e2e8f0]" />
        <div className="mt-8 h-64 rounded-3xl bg-white" />
      </div>
    </main>
  );
}
