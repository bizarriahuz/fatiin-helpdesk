import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TicketAssignmentForm } from "@/components/ticket-assignment-form";
import { TicketConversation } from "@/components/ticket-conversation";
import { TicketAssetLinkForm } from "@/components/asset-forms";
import { TicketMosqueForm } from "@/components/ticket-mosque-form";
import { TicketTypeForm } from "@/components/ticket-type-form";
import { priorityLabel, ticketCategoryLabel, ticketStatusLabel, ticketTypeLabel } from "@/lib/helpdesk-labels";

type TicketDetailPageProps = {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
};

export default function TicketDetailPage(props: TicketDetailPageProps) {
  return (
    <Suspense fallback={<TicketDetailLoading />}>
      <TicketDetailContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function TicketDetailContent({ params, searchParams }: TicketDetailPageProps) {
  await connection();
  const [{ ticketId }, { notice }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || typeof claims?.sub !== "string") {
    redirect("/");
  }

  const { data: membership } = await supabase
    .from("helpdesk_staff")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();

  const { data: ticketData, error } = await supabase
    .from("tickets")
    .select("id, requester_email, subject, mosque, ticket_type, category, description, location, status, priority, created_at, attachment_path, assigned_to, asset_id")
    .eq("id", ticketId)
    .maybeSingle();

  let ticket = ticketData;
  let mosqueMigrationMissing = false;
  let assetLinkMigrationMissing = false;
  if (error || !ticketData) {
    const fallback = await supabase
      .from("tickets")
      .select("id, requester_email, subject, category, description, location, status, created_at, attachment_path, assigned_to")
      .eq("id", ticketId)
      .maybeSingle();
    if (fallback.error || !fallback.data) notFound();
    ticket = {
      ...fallback.data,
      mosque: "Unspecified",
      ticket_type: "incident",
      priority: "normal",
      asset_id: null,
    };
    mosqueMigrationMissing = true;
    assetLinkMigrationMissing = true;
  }
  if (!ticket) notFound();

  const { data: ticketAssets } = membership && !assetLinkMigrationMissing
    ? await supabase.from("assets").select("id, asset_tag, name, mosque").order("asset_tag").limit(500)
    : { data: [] };
  const assets = (ticketAssets ?? []).filter((asset) =>
    asset.id === ticket.asset_id
    || ticket.mosque.trim().toLocaleLowerCase("en") === "unspecified"
    || asset.mosque.trim().toLocaleLowerCase("en") === ticket.mosque.trim().toLocaleLowerCase("en"),
  );
  const { data: clientSites, error: clientSitesError } = membership && !mosqueMigrationMissing
    ? await supabase.from("helpdesk_clients").select("name").order("name")
    : { data: [], error: null };

  const { data: signedAttachment } = ticket.attachment_path
    ? await supabase.storage.from("helpdesk-attachments").createSignedUrl(ticket.attachment_path, 60 * 60)
    : { data: null };
  const { data: ticketMessages, error: messagesError } = await supabase
    .from("ticket_messages")
    .select("id, author_id, author_email, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true })
    .limit(100);
  const attachmentUrl = signedAttachment?.signedUrl;
  const isImage = ticket.attachment_path?.endsWith(".jpg")
    || ticket.attachment_path?.endsWith(".png")
    || ticket.attachment_path?.endsWith(".webp");

  const backHref = membership ? "/staff/queue" : "/staff";
  const backLabel = membership ? "← Back to tickets" : "← Back to my tickets";
  const noticeValue = Array.isArray(notice) ? notice[0] : notice;
  const noticeMessage = {
    sent: "Request submitted. The helpdesk was notified by email.",
    not_configured: "Request saved. Email notifications are not configured yet.",
    failed: "Request saved, but the helpdesk notification email could not be sent.",
  }[noticeValue ?? ""];

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="text-sm font-medium text-[#0f766e] hover:underline">
          {backLabel}
        </Link>
        <article className="mt-6 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          {noticeMessage && (
            <p role="status" className="mb-6 rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm text-[#0f766e]">
              {noticeMessage}
            </p>
          )}
          <div className="flex flex-col gap-4 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                Ticket
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17263c]">
                {ticket.subject}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="w-fit rounded-full bg-[#ecfdf5] px-3 py-1 text-sm font-medium capitalize text-[#0f766e]">
                {ticketStatusLabel(ticket.status)}
              </span>
              <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold capitalize ${"priority" in ticket && ticket.priority === "urgent" ? "bg-red-100 text-red-800" : "priority" in ticket && ticket.priority === "high" ? "bg-amber-100 text-amber-800" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                {priorityLabel("priority" in ticket ? ticket.priority : "normal")} priority
              </span>
            </div>
          </div>

          <dl className="grid gap-5 border-b border-[#e2e8f0] py-6 sm:grid-cols-2">
            {"mosque" in ticket && (
              <div className={membership ? "sm:col-span-2" : ""}>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Customer site</dt>
                <dd className="mt-2">
                  {membership && !mosqueMigrationMissing && !clientSitesError ? (
                    <TicketMosqueForm ticketId={ticket.id} mosque={ticket.mosque} clientNames={(clientSites ?? []).map((client) => client.name)} />
                  ) : membership ? (
                    <span className="text-sm text-[#64748b]">Apply migrations 011 and 012 to manage this request&apos;s mosque.</span>
                  ) : (
                    <span className="text-sm text-[#243449]">{ticket.mosque}</span>
                  )}
                </dd>
              </div>
            )}
            {membership && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
                  Submitted by
                </dt>
                <dd className="mt-1 text-sm text-[#243449]">
                  {ticket.requester_email ?? "Email not available"}
                </dd>
              </div>
            )}
            {membership && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Assignee</dt>
                <dd className="mt-2">
                  <TicketAssignmentForm ticketId={ticket.id} assignedTo={ticket.assigned_to} currentUserId={claims.sub} />
                </dd>
              </div>
            )}
            {membership && (
              <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Asset</dt>
                <dd className="mt-2">
                  {assetLinkMigrationMissing ? (
                    <p className="text-sm text-[#64748b]">Apply the ticket-to-asset migration to link equipment to requests.</p>
                  ) : (
                    <TicketAssetLinkForm ticketId={ticket.id} assetId={ticket.asset_id} assets={assets ?? []} />
                  )}
                </dd>
              </div>
            )}
            <div className={membership && "ticket_type" in ticket ? "sm:col-span-2" : ""}>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
                Type
              </dt>
              <dd className="mt-1 text-sm text-[#243449]">
                {membership && "ticket_type" in ticket
                  ? <TicketTypeForm ticketId={ticket.id} ticketType={ticket.ticket_type} />
                  : "ticket_type" in ticket ? ticketTypeLabel(ticket.ticket_type) : "Incident"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Category</dt>
              <dd className="mt-1 text-sm text-[#243449]">{ticketCategoryLabel(ticket.category)}</dd>
            </div>
            {ticket.location && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
                  Location
                </dt>
                <dd className="mt-1 text-sm text-[#243449]">{ticket.location}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
                Submitted
              </dt>
              <dd className="mt-1 text-sm text-[#243449]">{formatDate(ticket.created_at)}</dd>
            </div>
          </dl>

          <section className="pt-6">
            <h2 className="text-sm font-semibold text-[#243449]">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#64748b]">
              {ticket.description}
            </p>
          </section>
          {ticket.attachment_path && (
            <section className="mt-6 border-t border-[#e2e8f0] pt-6">
              <h2 className="text-sm font-semibold text-[#243449]">Attachment</h2>
              {attachmentUrl ? (
                isImage ? (
                  <a href={attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                    {/* The attachment is served from a short-lived private Storage URL. */}
                    <img src={attachmentUrl} alt="Attachment provided with this support request" className="max-h-96 max-w-full rounded-xl border border-[#e2e8f0] object-contain" />
                  </a>
                ) : (
                  <a href={attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-[#ecfdf5] px-4 py-2 text-sm font-medium text-[#047857] hover:underline">
                    Open attached PDF
                  </a>
                )
              ) : (
                <p className="mt-2 text-sm text-[#64748b]">The attachment could not be opened.</p>
              )}
            </section>
          )}
        </article>
        {messagesError ? (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            The conversation could not be loaded. Check that the ticket conversation migration has been applied.
          </p>
        ) : (
          <TicketConversation
            ticketId={ticket.id}
            currentUserId={claims.sub}
            messages={ticketMessages ?? []}
            isStaff={Boolean(membership)}
          />
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

function TicketDetailLoading() {
  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="h-6 w-44 rounded bg-[#e2e8f0]" />
        <div className="mt-6 h-80 rounded-3xl bg-white" />
      </div>
    </main>
  );
}
