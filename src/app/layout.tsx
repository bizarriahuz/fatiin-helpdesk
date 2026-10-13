import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Roboto } from "next/font/google";
import { cn } from "@/lib/utils";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Fatiin Helpdesk | IT support, assets, and devices",
  description:
    "Submit and track support tickets, assets, and monitored devices for Fatiin Multimedia and its customer sites.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", roboto.variable)}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
