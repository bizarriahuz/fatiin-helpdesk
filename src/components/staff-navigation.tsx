"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, LayoutDashboard, Monitor, Package, Ticket } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

const staffLinks = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Tickets", href: "/staff/queue", icon: Ticket },
  { label: "Assets", href: "/staff/assets", icon: Package },
  { label: "Devices", href: "/staff/monitoring", icon: Monitor },
  { label: "Customers & sites", href: "/staff/clients", icon: Building2 },
  { label: "Reports", href: "/staff/reports", icon: BarChart3 },
] as const;

const requesterLinks = [
  { label: "My tickets", href: "/staff", icon: Ticket },
  { label: "New ticket", href: "/staff/new", icon: Package },
] as const;

export function StaffNavigation({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const links = isStaff ? staffLinks : requesterLinks;

  return (
    <aside className="border-b border-[#1e2b40] bg-[#101b2d] px-4 py-4 text-white print:hidden md:sticky md:top-0 md:h-screen md:min-h-screen md:border-b-0 md:px-4 md:py-6">
      <div className="flex items-center justify-between gap-3 md:block">
        <Link href="/staff" className="flex min-w-fit items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[#34d399]">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#0f766e] text-lg font-bold text-[#08251f] shadow-lg shadow-emerald-950/30">F</span>
          <span className="block">
            <span className="block text-[15px] font-semibold tracking-tight text-white">Fatiin Helpdesk</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">IT management</span>
          </span>
        </Link>
        <div className="md:hidden"><SignOutButton /></div>
      </div>
      <div className="mb-2 mt-8 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:block">Workspace</div>
      <nav aria-label="Main navigation" className="mt-4 flex gap-1 overflow-x-auto pb-1 md:mt-0 md:block md:space-y-1">
        {links.map(({ label, href, icon: Icon }) => {
          const active = href === "/staff" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              href={href}
              key={href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${active ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300 shadow-sm shadow-black/10" : "border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
            >
              <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {active && <span className="ml-auto hidden size-1.5 rounded-full bg-emerald-300 md:block" />}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 hidden border-t border-white/10 pt-5 md:block"><SignOutButton /></div>
    </aside>
  );
}
