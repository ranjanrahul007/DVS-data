"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import HistoryDropdown from "@/components/HistoryDropdown";
import { useAuth } from "@/components/AuthProvider";
import { portalConfig } from "@/app/tableConfig";

interface PortalShellProps {
  activePage: "home" | "tables";
  title: string;
  meta: string;
  children: ReactNode;
  reloadKey?: number;
  onReverted?: () => void;
}

export default function PortalShell({
  activePage,
  title,
  meta,
  children,
  reloadKey = 0,
  onReverted,
}: PortalShellProps) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const goToLogin = () => {
    const redirect = activePage === "tables" ? "/tables" : "/";
    router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.12),_transparent_35%),linear-gradient(180deg,_#fffdf6_0%,_#eff6ff_55%,_#f8fafc_100%)] text-slate-800">
      <header className="border-b-4 border-amber-400 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10 text-cyan-200">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 6h16M4 12h16M4 18h16M8 4v16M16 4v16"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-[0.18em] uppercase">
                {portalConfig.portalName}
              </h1>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                {portalConfig.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end lg:self-auto">
            {loading ? (
              <span className="text-xs text-slate-400">Loading session...</span>
            ) : user ? (
              <>
                <span className="hidden text-xs text-slate-300 sm:inline">
                  Signed in as <span className="font-semibold text-white">{user.username}</span>
                </span>
                <button
                  onClick={() => void logout()}
                  className="cursor-pointer border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white hover:text-slate-950"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={goToLogin}
                className="cursor-pointer bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-white"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-3 sm:px-6 md:px-8">
          {[
            { href: "/", label: "Home", key: "home" },
            { href: "/tables", label: "Tables", key: "tables" },
          ].map((item) => {
            const isActive = activePage === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <section className="border-b border-slate-200/80 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
              Data Workspace
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{meta}</p>
          </div>
          <div className="flex items-center gap-3">
            {onReverted ? (
              <HistoryDropdown
                canRevert={!!user}
                reloadKey={reloadKey}
                onReverted={onReverted}
              />
            ) : null}
            <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 sm:block">
              Updated {portalConfig.lastUpdated}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">{children}</main>
    </div>
  );
}
