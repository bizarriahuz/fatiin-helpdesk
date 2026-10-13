"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-11 w-fit rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm font-semibold text-[#0f766e] transition hover:bg-[#f1f5f9] print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
