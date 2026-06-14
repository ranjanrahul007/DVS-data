"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function isSafeRedirect(target: string | null): target is string {
  // Only allow same-origin, absolute paths to prevent open-redirects.
  return !!target && target.startsWith("/") && !target.startsWith("//");
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, signup } = useAuth();

  const redirectParam = searchParams.get("redirect");
  const redirectTo = isSafeRedirect(redirectParam) ? redirectParam : "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already signed in, leave the login page.
  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const action = mode === "login" ? login : signup;
    const result = await action(username.trim(), password);
    setSubmitting(false);
    if (result.ok) {
      router.replace(redirectTo);
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header band to match the portal */}
      <div className="bg-[#003366] border-b-4 border-[#FFB300] py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <svg
            className="w-8 h-8 text-[#FFB300]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h1 className="text-xl font-bold text-white tracking-wide">Data Portal</h1>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-gray-200">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`py-3 text-sm font-semibold uppercase tracking-wider transition cursor-pointer ${
                  mode === m
                    ? "bg-[#003366] text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="p-6">
            <h2 className="text-lg font-bold text-[#002244] mb-1">
              {mode === "login" ? "Sign in to continue" : "Create an account"}
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              You need an account to add, edit, or revert data in the portal.
            </p>

            {error && (
              <div
                role="alert"
                className="mb-4 border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold text-gray-500 mb-1"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                  placeholder="e.g. jane.doe"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-500 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                  placeholder="••••••••"
                />
                {mode === "signup" && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    At least 6 characters.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#003366] hover:bg-[#002244] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider px-6 py-3 cursor-pointer transition"
              >
                {submitting
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-4 text-xs text-[#003366] hover:underline cursor-pointer"
            >
              ← Back to the portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <span className="text-[#003366] font-semibold">Loading…</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
