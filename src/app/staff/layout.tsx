import type { ReactNode } from "react";
import { StaffNavigation } from "@/components/staff-navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  let isStaff = false;

  if (typeof userId === "string") {
    const { data: membership } = await supabase
      .from("helpdesk_staff")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    isStaff = Boolean(membership);
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <StaffNavigation isStaff={isStaff} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
