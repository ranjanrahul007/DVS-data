"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface HistoryItem {
  id: string;
  username: string;
  action: string;
  tableId: string | null;
  description: string;
  timestamp: string;
  revertOf?: string;
  reverted?: boolean;
}

interface HistoryDropdownProps {
  /** Whether the current visitor can revert changes (i.e. is signed in). */
  canRevert: boolean;
  /** Bump this to force a history refresh (e.g. after an edit elsewhere). */
  reloadKey: number;
  /** Called after a successful revert so the parent can reload table data. */
  onReverted: () => void;
}

function formatTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleString();
}

export default function HistoryDropdown({
  canRevert,
  reloadKey,
  onReverted,
}: HistoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const data = await res.json();
      setItems(data.history ?? []);
    } catch {
      setError("Could not load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load whenever the panel is open and the reload signal changes. Fetching
  // remote data is exactly what effects are for; the setState happens inside
  // the async fetch, which the lint rule flags conservatively.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) load();
  }, [open, reloadKey, load]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleRevert = async (id: string) => {
    setRevertingId(id);
    setError(null);
    try {
      const res = await fetch("/api/history/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Revert failed.");
        return;
      }
      onReverted();
      await load();
    } catch {
      setError("Network error during revert.");
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title="View edit history"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003366] border border-[#003366] hover:bg-[#003366] hover:text-white transition duration-150 cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        History
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] overflow-y-auto bg-white border border-gray-200 shadow-lg z-50">
          <div className="sticky top-0 bg-[#003366] text-white px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Edit History
            </span>
            <button
              type="button"
              onClick={() => load()}
              className="text-[11px] text-blue-200 hover:text-white cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="px-4 py-2 text-xs text-red-700 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}

          {loading && (
            <div className="px-4 py-6 text-center text-xs text-gray-500">
              Loading history…
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-500">
              No changes have been recorded yet.
            </div>
          )}

          {!loading && (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => {
                const isRevert = item.action === "revert";
                return (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#002244]">
                            {item.username}
                          </span>
                          {isRevert && (
                            <span className="text-[10px] font-semibold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5">
                              revert
                            </span>
                          )}
                          {item.reverted && !isRevert && (
                            <span className="text-[10px] font-semibold uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5">
                              reverted
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 break-words">
                          {item.description}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {formatTime(item.timestamp)}
                        </p>
                      </div>
                      {canRevert && (
                        <button
                          type="button"
                          onClick={() => handleRevert(item.id)}
                          disabled={revertingId === item.id}
                          className="shrink-0 text-[11px] font-semibold text-[#003366] border border-[#003366] px-2 py-1 hover:bg-[#003366] hover:text-white transition disabled:opacity-50 cursor-pointer"
                        >
                          {revertingId === item.id ? "…" : "Revert"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!canRevert && items.length > 0 && (
            <div className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 bg-gray-50">
              Sign in to revert changes.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
