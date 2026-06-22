"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackendDataTable from "@/components/BackendDataTable";
import PortalShell from "@/components/PortalShell";
import { useAuth } from "@/components/AuthProvider";
import {
  confirmImport,
  fetchTableSummaries,
  previewImport,
  type ImportPreview,
  type TableSummary,
} from "@/lib/tableApi";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTableId, setActiveTableId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchTableSummaries();
        if (!active) return;
        setTables(data);
        setActiveTableId((current) => current || (data[0] ? String(data[0].id) : ""));
      } catch {
        if (active) setError("Backend unavailable. Showing fallback table data.");
      } finally {
        if (active) setIsLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const goToLogin = useCallback(() => {
    router.push(`/login?redirect=${encodeURIComponent("/")}`);
  }, [router]);

  const reloadTables = useCallback(async () => {
    try {
      const data = await fetchTableSummaries();
      setTables(data);
      setActiveTableId((current) =>
        current && data.some((table) => String(table.id) === current)
          ? current
          : (data[0] ? String(data[0].id) : ""),
      );
      setError(null);
      setReloadKey((value) => value + 1);
    } catch {
      setError("Backend unavailable. Showing fallback table data.");
    }
  }, []);

  const handlePreviewImport = useCallback(async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    try {
      const preview = await previewImport(selectedFile);
      setImportPreview(preview);
      setError(null);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Could not parse file.");
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile]);

  const handleConfirmImport = useCallback(async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    try {
      const imported = await confirmImport(selectedFile);
      await reloadTables();
      setActiveTableId(String(imported.id));
      setImportPreview(null);
      setSelectedFile(null);
      setError(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import file.");
    } finally {
      setIsImporting(false);
    }
  }, [reloadTables, selectedFile]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <span className="text-sm font-semibold text-slate-700">Loading Data Portal...</span>
      </div>
    );
  }

  return (
    <PortalShell
      activePage="home"
      title="Upload a Sheet and Preview the Full Table"
      meta={`Imported sheets available: ${tables.length} | After import, the full sheet is shown below and is also available on the tables page.`}
      reloadKey={reloadKey}
      onReverted={() => void reloadTables()}
    >
      <div className="space-y-6">
        {!user ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You are viewing as guest. Sign in if you want to edit or revert imported data.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.55)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div>
              <div className="mb-5 border-b border-slate-100 pb-4">
                <label
                  htmlFor="table-file-upload"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                >
                  Upload Sheet
                </label>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    id="table-file-upload"
                    type="file"
                    accept=".xlsx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setSelectedFile(file);
                      setImportPreview(null);
                    }}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-800"
                  />
                  <button
                    type="button"
                    onClick={() => void handlePreviewImport()}
                    disabled={!selectedFile || isImporting}
                    className="cursor-pointer rounded-full bg-cyan-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-800 disabled:bg-slate-300"
                  >
                    {isImporting ? "Parsing..." : "Preview Import"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Upload Excel or PDF table exports. Confirm the import, and the full sheet will be loaded below.
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Current Imported Table
                </p>
                <div className="mt-3">
                  <select
                    value={activeTableId}
                    onChange={(event) => setActiveTableId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600"
                  >
                    {tables.length === 0 ? <option value="">No imported tables yet</option> : null}
                    {tables.map((table) => (
                      <option key={table.id} value={String(table.id)}>
                        {table.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Use the <Link href={activeTableId ? `/tables?table=${encodeURIComponent(activeTableId)}` : "/tables"} className="font-semibold text-cyan-700 underline">Tables page</Link> to search any name and show the complete matching row.
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-dashed border-cyan-200 bg-cyan-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-900">
                Import Preview
              </p>
              {importPreview && (
                <div className="mt-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        Preview: {importPreview.tableName}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {importPreview.totalRows} rows, {importPreview.totalColumns} columns, source {importPreview.sourceFilename}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleConfirmImport()}
                      disabled={isImporting}
                      className="cursor-pointer rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-800 disabled:bg-slate-300"
                    >
                      {isImporting ? "Importing..." : "Confirm Import"}
                    </button>
                  </div>
                  {importPreview.warnings.length > 0 && (
                    <div className="mt-3 text-xs text-amber-800">
                      {importPreview.warnings.join(" ")}
                    </div>
                  )}
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-950 text-white">
                        <tr>
                          {importPreview.columns.map((column) => (
                            <th key={column} className="px-3 py-2 font-semibold">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.map((row, rowIndex) => (
                          <tr key={`${rowIndex}-${row.join("|")}`} className={rowIndex % 2 ? "bg-cyan-50/50" : "bg-white"}>
                            {row.map((cell, cellIndex) => (
                              <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-slate-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!importPreview ? (
                <div className="mt-3 rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-500">
                  Select a file and click preview to inspect it before importing.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {activeTableId ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Full Uploaded Sheet</h3>
                <p className="text-sm text-slate-600">
                  This is the complete imported table currently selected from home.
                </p>
              </div>
            </div>
            <BackendDataTable
              tableId={activeTableId}
              canEdit={!!user}
              onAuthRequired={goToLogin}
            />
          </section>
        ) : (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No imported sheet is available yet. Upload a file to show its table here.
          </div>
        )}
      </div>
    </PortalShell>
  );
}
