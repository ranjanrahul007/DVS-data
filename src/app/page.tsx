"use client";

import React, { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { portalConfig } from "./tableConfig";
import BackendDataTable from "@/components/BackendDataTable";
import HistoryDropdown from "@/components/HistoryDropdown";
import { useAuth } from "@/components/AuthProvider";
import {
  confirmImport,
  fetchTableSummaries,
  previewImport,
  type ImportPreview,
  type TableSummary,
} from "@/lib/tableApi";

type Tab = "home" | "tables" | "about" | "contact";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masterSearchQuery, setMasterSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const deferredMasterSearchQuery = useDeferredValue(masterSearchQuery);

  // Load the authoritative table data from the server.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchTableSummaries();
        if (active) setTables(data);
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
      setError(null);
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
      await confirmImport(selectedFile);
      await reloadTables();
      setImportPreview(null);
      setSelectedFile(null);
      setError(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import file.");
    } finally {
      setIsImporting(false);
    }
  }, [reloadTables, selectedFile]);

  const getHeroDetails = () => {
    switch (activeTab) {
      case "home":
        return {
          title: "Welcome to the Data Portal",
          meta: `Platform version: 2.1.0 | Last updated: ${portalConfig.lastUpdated}`,
        };
      case "tables":
        return {
          title: "Interactive Public Data Tables Directory",
          meta: `Total Datasets: ${tables.length} | Changes are saved to the server`,
        };
      case "about":
        return {
          title: "About Open Data Initiative",
          meta: `Published under the Open Data Initiative policy`,
        };
      case "contact":
        return {
          title: "Contact & Support Desk",
          meta: "Get in touch with the data administrators",
        };
    }
  };

  const hero = getHeroDetails();
  const showHistory = activeTab === "home" || activeTab === "tables";

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <span className="text-[#003366] font-semibold">Loading Data Portal...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-[#f8fafc]">
      {/* 1. Header */}
      <header className="bg-[#003366] text-white py-4 px-4 sm:px-6 md:px-8 border-b-4 border-[#FFB300]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-10 h-10 text-[#FFB300] shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-wide">Data Portal</h1>
              <p className="text-xs text-gray-300 font-medium tracking-wider uppercase">
                {portalConfig.tagline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {authLoading ? (
              <span className="text-xs text-gray-400">…</span>
            ) : user ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="hidden sm:inline text-gray-300">
                  Signed in as{" "}
                  <span className="font-semibold text-white">{user.username}</span>
                </span>
                <button
                  onClick={() => logout()}
                  className="bg-[#002244] border border-gray-400 hover:bg-white hover:text-[#002244] text-gray-200 font-semibold px-3 py-1.5 transition duration-150 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={goToLogin}
                className="bg-[#FFB300] text-[#002244] hover:bg-white text-xs font-semibold px-3 py-1.5 transition duration-150 cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Navigation Bar */}
      <nav className="bg-[#002244] text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap">
          {(["home", "tables", "about", "contact"] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-none duration-0 cursor-pointer ${
                  isActive
                    ? "bg-[#FFB300] text-[#002244]"
                    : "hover:bg-[#003366] text-white"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Hero / Page Title strip */}
      <section className="bg-blue-50 border-b border-blue-100 py-6 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#002244]">{hero.title}</h2>
            <p className="text-xs text-gray-500 mt-1">{hero.meta}</p>
          </div>
          <div className="flex items-center gap-4">
            {showHistory && (
              <HistoryDropdown
                canRevert={!!user}
                reloadKey={0}
                onReverted={reloadTables}
              />
            )}
            <div className="text-xs text-gray-400 hidden sm:block">
              Current Path:{" "}
              <span className="font-mono text-[#003366]">{`/${activeTab}`}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 md:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {showHistory && (
          <div className="space-y-8">
            {!user && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
                You are viewing as a guest. <button onClick={goToLogin} className="font-semibold underline cursor-pointer">Sign in</button> to add, edit, or revert data.
              </div>
            )}
            <div className="bg-white border border-gray-200 p-4 sm:p-5">
              <div className="mb-5 border-b border-gray-100 pb-4">
                <label
                  htmlFor="table-file-upload"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2"
                >
                  Import Custom Table
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
                    className="block w-full text-sm text-gray-600 file:mr-4 file:border-0 file:bg-[#003366] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#002244]"
                  />
                  <button
                    type="button"
                    onClick={() => void handlePreviewImport()}
                    disabled={!selectedFile || isImporting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#003366] disabled:bg-gray-300 transition duration-150 cursor-pointer"
                  >
                    {isImporting ? "Parsing..." : "Preview Import"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Upload Excel or PDF table exports. PDF parsing is preview-first because table extraction can be imperfect.
                </p>
              </div>

              <label
                htmlFor="master-table-search"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2"
              >
                Master Search
              </label>
              <input
                id="master-table-search"
                type="text"
                value={masterSearchQuery}
                onChange={(e) => setMasterSearchQuery(e.target.value)}
                placeholder="Type a name or part of a name to filter matching rows"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
              />
              <p className="mt-2 text-xs text-gray-500">
                Search is case-insensitive and prioritizes rows whose name fields match first.
              </p>

              {importPreview && (
                <div className="mt-5 border border-blue-200 bg-blue-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#003366]">
                        Preview: {importPreview.tableName}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {importPreview.totalRows} rows, {importPreview.totalColumns} columns, source {importPreview.sourceFilename}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleConfirmImport()}
                      disabled={isImporting}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#003366] disabled:bg-gray-300 transition duration-150 cursor-pointer"
                    >
                      {isImporting ? "Importing..." : "Confirm Import"}
                    </button>
                  </div>
                  {importPreview.warnings.length > 0 && (
                    <div className="mt-3 text-xs text-amber-800">
                      {importPreview.warnings.join(" ")}
                    </div>
                  )}
                  <div className="mt-4 overflow-x-auto border border-blue-100 bg-white">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-[#003366] text-white">
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
                          <tr key={`${rowIndex}-${row.join("|")}`} className={rowIndex % 2 ? "bg-blue-50/50" : "bg-white"}>
                            {row.map((cell, cellIndex) => (
                              <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-gray-700">
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
            </div>
            {tables.map((table) => (
              <BackendDataTable
                key={table.id}
                tableId={String(table.id)}
                canEdit={!!user}
                onAuthRequired={goToLogin}
                externalSearchQuery={deferredMasterSearchQuery}
              />
            ))}
          </div>
        )}

        {activeTab === "about" && (
          <div className="bg-white border border-gray-200 p-6 space-y-6">
            <section>
              <h3 className="text-lg font-bold text-[#003366] border-b border-gray-100 pb-2 mb-3">
                1. Objective & Goal
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                The objective of the open data governance portal is to improve transparency and accessibility of public information. By publishing data in structured and downloadable formats, we enable automated processing, data-driven policymaking, and civic participation.
              </p>
            </section>
            <section>
              <h3 className="text-lg font-bold text-[#003366] border-b border-gray-100 pb-2 mb-3">
                2. Data Licensing & Reuse
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                All datasets listed on this portal are licensed under the Open Government Data License. Users are free to copy, publish, distribute, transmit and adapt the data for both commercial and non-commercial purposes, provided appropriate attribution is made to the respective source department.
              </p>
            </section>
            <section>
              <h3 className="text-lg font-bold text-[#003366] border-b border-gray-100 pb-2 mb-3">
                3. Privacy & Safety
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                No personally identifiable information (PII) is collected or published on the portal. All public statistics are anonymized, aggregated, and approved by the corresponding ministries prior to release.
              </p>
            </section>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-[#003366] border-b border-gray-100 pb-2 mb-4">
                Leave a Query or Feedback
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(
                    "Feedback submitted successfully. Reference ID: " +
                      Math.floor(100000 + Math.random() * 900000),
                  );
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullname" className="block text-xs font-semibold text-gray-500 mb-1">
                      Full Name
                    </label>
                    <input
                      id="fullname"
                      type="text"
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-500 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold text-gray-500 mb-1">
                    Subject / Dataset ID
                  </label>
                  <input
                    id="subject"
                    type="text"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-semibold text-gray-500 mb-1">
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold uppercase tracking-wider px-6 py-3 cursor-pointer"
                >
                  Submit Query
                </button>
              </form>
          </div>
        )}
      </main>

      {/* 5. Footer */}
      <footer className="bg-[#002244] text-gray-400 py-6 px-4 border-t-4 border-[#FFB300]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-center md:text-left">
            <p className="text-gray-300">
              © {new Date().getFullYear()} Data Portal. All rights reserved.
            </p>
            <p className="mt-1 text-gray-500">
              Designed & developed as a dynamic open data architecture project.
            </p>
          </div>
          <div className="text-center md:text-right font-mono">
            <span>Last Updated: {portalConfig.lastUpdated}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
