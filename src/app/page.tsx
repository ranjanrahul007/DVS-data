"use client";

import React, { useState, useEffect } from "react";
import { portalConfig, TableConfig } from "./tableConfig";
import DataTable from "@/components/DataTable";

type Tab = "home" | "tables" | "about" | "contact";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("datagov_tables");
    if (saved) {
      try {
        setTables(JSON.parse(saved));
      } catch (e) {
        setTables(portalConfig.tables);
      }
    } else {
      setTables(portalConfig.tables);
    }
    setIsMounted(true);
  }, []);

  const handleUpdateTable = (updatedTable: TableConfig) => {
    const updated = tables.map((t) => (t.id === updatedTable.id ? updatedTable : t));
    setTables(updated);
    localStorage.setItem("datagov_tables", JSON.stringify(updated));
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all tables to their default state? This will erase your custom edits.")) {
      setTables(portalConfig.tables);
      localStorage.removeItem("datagov_tables");
    }
  };

  // Config-driven values for the Hero Strip depending on the tab
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
          meta: `Total Datasets: ${tables.length} | Edits are saved locally in your browser`,
        };
      case "about":
        return {
          title: "About Open Data Initiative",
          meta: `Published under the Open Data Initiative policy`,
        };
      case "contact":
        return {
          title: "Contact & Support Desk",
          meta: "Get in touch with the data administrators and grievance team",
        };
    }
  };

  const hero = getHeroDetails();

  if (!isMounted) {
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
            {/* National Emblem style SVG / Logo */}
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
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              className="bg-[#002244] border border-gray-400 hover:bg-[#FFB300] hover:text-[#002244] hover:border-[#FFB300] text-gray-200 text-xs font-semibold px-3 py-1.5 transition duration-150 cursor-pointer"
            >
              Reset to Defaults
            </button>
            <div className="text-xs text-right hidden md:block">
              <span className="bg-[#002244] px-3 py-1 text-gray-300 font-mono">
                SECURE PORTAL
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Navigation Bar */}
      <nav className="bg-[#002244] text-white sticky top-0 z-50">
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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-[#002244]">{hero.title}</h2>
            <p className="text-xs text-gray-500 mt-1">{hero.meta}</p>
          </div>
          <div className="text-xs text-gray-400">
            Current Path: <span className="font-mono text-[#003366]">{`/${activeTab}`}</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {/* Dynamic content rendering based on activeTab */}
        {(activeTab === "home" || activeTab === "tables") && (
          <div className="space-y-8">
            {tables.map((table) => (
              <DataTable
                key={table.id}
                config={table}
                onUpdate={handleUpdateTable}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 p-6 lg:col-span-2">
              <h3 className="text-lg font-bold text-[#003366] border-b border-gray-100 pb-2 mb-4">
                Leave a Query or Feedback
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Feedback submitted successfully. Reference ID: " + Math.floor(100000 + Math.random() * 900000));
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

            <div className="bg-white border border-gray-200 p-6 space-y-6">
              <div>
                <h4 className="font-bold text-[#002244] text-sm">Grievance Officer</h4>
                <p className="text-xs text-gray-500 mt-1">Shri R. K. Sen, Joint Secretary</p>
                <p className="text-xs text-gray-500">Ministry of Electronics & IT</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-bold text-[#002244] text-sm">Office Address</h4>
                <p className="text-xs text-gray-500 mt-1">Electronics Niketan, 6, CGO Complex,</p>
                <p className="text-xs text-gray-500">Lodhi Road, New Delhi - 110003</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-bold text-[#002244] text-sm">Contact Channels</h4>
                <p className="text-xs text-gray-500 mt-1">Email: contact@datagov.gov.in</p>
                <p className="text-xs text-gray-500">Phone: +91-11-24301900</p>
              </div>
            </div>
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
