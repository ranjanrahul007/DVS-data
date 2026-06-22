"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackendDataTable from "@/components/BackendDataTable";
import PortalShell from "@/components/PortalShell";
import { useAuth } from "@/components/AuthProvider";
import { fetchTableSummaries, type TableSummary } from "@/lib/tableApi";

export default function TablesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [masterSearchQuery, setMasterSearchQuery] = useState("");
  const [routeTableId, setRouteTableId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const deferredMasterSearchQuery = useDeferredValue(masterSearchQuery);

  const loadTables = useCallback(async () => {
    try {
      const data = await fetchTableSummaries();
      setTables(data);
      setError(null);
      setReloadKey((value) => value + 1);
      return data;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load tables.");
      return [];
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setRouteTableId(params.get("table") ?? "");
    setMasterSearchQuery(params.get("q") ?? "");
  }, []);

  useEffect(() => {
    if (!routeTableId && tables.length > 0) {
      setRouteTableId(String(tables[0].id));
    }
  }, [routeTableId, tables]);

  const selectedTableId = useMemo(() => {
    if (!tables.length) return "";
    return routeTableId && tables.some((table) => String(table.id) === routeTableId)
      ? routeTableId
      : String(tables[0].id);
  }, [routeTableId, tables]);

  const handleSelectTable = (tableId: string) => {
    const params = new URLSearchParams();
    params.set("table", tableId);
    if (masterSearchQuery.trim()) params.set("q", masterSearchQuery.trim());
    router.replace(`/tables?${params.toString()}`);
    setRouteTableId(tableId);
  };

  const handleSearchChange = (query: string) => {
    setMasterSearchQuery(query);
    const params = new URLSearchParams();
    if (selectedTableId) params.set("table", selectedTableId);
    if (query.trim()) params.set("q", query.trim());
    router.replace(`/tables?${params.toString()}`);
  };

  const selectedTable = useMemo(
    () => tables.find((table) => String(table.id) === selectedTableId) ?? null,
    [selectedTableId, tables],
  );

  const goToLogin = useCallback(() => {
    router.push(`/login?redirect=${encodeURIComponent("/tables")}`);
  }, [router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <span className="text-sm font-semibold text-slate-700">Loading tables...</span>
      </div>
    );
  }

  return (
    <PortalShell
      activePage="tables"
      title="Search Any Imported Table"
      meta={`Total imported sheets: ${tables.length} | Search by name to show the full matching row.`}
      reloadKey={reloadKey}
      onReverted={() => void loadTables()}
    >
      <div className="space-y-6">
        {!user ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You are viewing as guest. Sign in if you want to edit the imported table data.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.55)]">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Choose Table
              </span>
              <select
                value={selectedTableId}
                onChange={(event) => handleSelectTable(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:bg-white"
              >
                {tables.length === 0 ? <option value="">No imported tables</option> : null}
                {tables.map((table) => (
                  <option key={table.id} value={String(table.id)}>
                    {table.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Master Search
              </span>
              <input
                type="text"
                value={masterSearchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search a person name to show the full row data"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:bg-white"
              />
            </label>
          </div>

          {selectedTable ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {selectedTable.rowCount} rows and {selectedTable.columnCount} columns loaded from{" "}
              <span className="font-semibold text-slate-900">{selectedTable.sourceFile}</span>.
            </div>
          ) : null}
        </section>

        {selectedTableId ? (
          <BackendDataTable
            tableId={selectedTableId}
            canEdit={!!user}
            onAuthRequired={goToLogin}
            externalSearchQuery={deferredMasterSearchQuery}
          />
        ) : (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Import a sheet on the home page, then it will appear here.
          </div>
        )}
      </div>
    </PortalShell>
  );
}
