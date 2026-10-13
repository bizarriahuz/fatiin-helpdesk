import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CreateClientForm, RenameClientForm } from "@/components/client-directory-forms";
import { createClient } from "@/lib/supabase/server";

export default function ClientsPage() {
  return <Suspense fallback={<ClientsLoading />}><ClientsContent /></Suspense>;
}

async function ClientsContent() {
  await connection();
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

  const { data: clients, error } = await supabase
    .from("helpdesk_clients")
    .select("id, name, created_at")
    .order("name");
  const siteCount = clients?.length ?? 0;

  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 text-[#17263c] sm:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mt-6 border-b border-[#e2e8f0] pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Fatiin Multimedia</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17263c]">Customers and sites</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">Manage the customer sites linked to tickets and assets. Renaming a site also updates its linked records.</p>
        </header>

        <section className="mt-8 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-[#17263c]">Add a customer site</h2>
          <CreateClientForm />
        </section>

        <section className="mt-8 rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-[#17263c]">Site list</h2>
            <p className="mt-1 text-sm text-[#64748b]">{siteCount} {siteCount === 1 ? "site" : "sites"} available to requesters and staff.</p>
          </div>
          {error ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">We couldn&apos;t load the directory. Apply migration 012, then refresh this page.</p>
          ) : clients?.length ? (
            <ul className="mt-5 divide-y divide-[#e2e8f0]">
              {clients.map((client) => (
                <li key={client.id} className="py-4">
                  <RenameClientForm client={client} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#f1f5f9] px-5 py-6 text-sm text-[#64748b]">No sites are set up yet. Add the first one above.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function ClientsLoading() {
  return (
    <main className="min-h-screen bg-[#f1f5f9] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="h-24 rounded-xl bg-[#e2e8f0]" />
        <div className="mt-8 h-48 rounded-3xl bg-white" />
      </div>
    </main>
  );
}
