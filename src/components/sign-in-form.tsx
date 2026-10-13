"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage("Sign-in failed. Check your email and password, then try again.");
        return;
      }

      router.replace("/staff");
      router.refresh();
    } catch {
      setErrorMessage("We couldn't connect to the helpdesk. Please try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#243449]">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@example.com"
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#243449]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm text-[#243449] outline-none placeholder:text-[#94a3b8] focus-visible:ring-2 focus-visible:ring-[#0f766e]"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-[#047857] text-sm font-semibold text-white transition hover:bg-[#065f46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#047857] disabled:cursor-wait disabled:opacity-65"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
