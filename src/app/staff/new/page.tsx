import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { TicketForm } from "@/components/ticket-form";
import { createClient } from "@/lib/supabase/server";

export default function NewTicketPage() {
  return (
    <Suspense fallback={<TicketPageLoading />}>
      <NewTicketContent />
    </Suspense>
  );
}

async function NewTicketContent() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/");
  }

  const { data: clients, error: clientsError } = await supabase
    .from("helpdesk_clients")
    .select("name")
    .order("name");

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/staff" className="text-sm font-medium text-[#0f766e] hover:underline">
          ← Back to my tickets
        </Link>
        <section className="mt-6 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
          New ticket
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17263c]">
            Tell us what you need help with
          </h1>
          <p className="mb-8 mt-2 text-sm leading-6 text-[#64748b]">
            Add a few details so the support team can help.
          </p>
          <TicketForm clientNames={(clients ?? []).map((client) => client.name)} clientDirectoryError={Boolean(clientsError)} />
        </section>
      </div>
    </main>
  );
}

function TicketPageLoading() {
  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="h-6 w-40 rounded bg-[#e2e8f0]" />
        <div className="mt-6 h-[38rem] rounded-3xl bg-white" />
      </div>
    </main>
  );
}
