"use client";

import React, { useState } from "react";
import { TableConfig } from "@/app/tableConfig";
import type { HistoryAction } from "@/lib/types";

export interface CommitDescriptor {
  action: HistoryAction;
  description: string;
}

interface DataTableProps {
  config: TableConfig;
  externalSearchQuery?: string;
  /** Whether the current visitor is allowed to edit. */
  canEdit: boolean;
  /**
   * Persist a change. Returns true on success; on false the table rolls its
   * local draft back to the last server-confirmed state.
   */
  onCommit: (updated: TableConfig, descriptor: CommitDescriptor) => Promise<boolean>;
  /** Invoked when an unauthenticated visitor attempts to edit. */
  onAuthRequired: () => void;
}

export default function DataTable({
  config,
  externalSearchQuery = "",
  canEdit,
  onCommit,
  onAuthRequired,
}: DataTableProps) {
  // Local working copy. Keystrokes update this instantly; we persist (and log
  // history) only on blur / structural actions to avoid one entry per keypress.
  const [draft, setDraft] = useState<TableConfig>(config);
  // Buffer for the column header currently being renamed (the rename + key
  // remap is only applied on blur, never mid-typing).
  const [editingCol, setEditingCol] = useState<{ idx: number; value: string } | null>(
    null,
  );

  // Re-sync the draft whenever the server-confirmed config changes (React's
  // "adjust state during render" pattern — no effect needed).
  const [syncedConfig, setSyncedConfig] = useState(config);
  if (syncedConfig !== config) {
    setSyncedConfig(config);
    setDraft(config);
  }

  const normalizedQuery = externalSearchQuery.trim().toLowerCase();
  const rowsWithIndex = draft.rows.map((row, originalIndex) => ({ row, originalIndex }));
  const nameColumns = draft.columns.filter((col) => col.toLowerCase().includes("name"));

  const getCellsForColumns = (row: Record<string, unknown>, columns: string[]) =>
    columns
      .map((col) => row[col])
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).toLowerCase());

  const getMatchRank = (values: string[]) => {
    if (values.some((value) => value.startsWith(normalizedQuery))) return 0;
    if (values.some((value) => value.includes(normalizedQuery))) return 1;
    return Number.POSITIVE_INFINITY;
  };

  const filteredRows = !normalizedQuery
    ? rowsWithIndex
    : rowsWithIndex
        .map(({ row, originalIndex }) => {
          const nameValues = getCellsForColumns(row, nameColumns);
          const allValues = getCellsForColumns(row, draft.columns);
          const nameRank = getMatchRank(nameValues);
          const fallbackRank = getMatchRank(allValues);
          const rank = Number.isFinite(nameRank) ? nameRank : fallbackRank + 2;
          return { row, originalIndex, rank };
        })
        .filter(({ rank }) => Number.isFinite(rank))
        .sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex);

  /** Optimistically apply a change, persist it, and roll back on failure. */
  const doCommit = async (newConfig: TableConfig, descriptor: CommitDescriptor) => {
    setDraft(newConfig);
    const ok = await onCommit(newConfig, descriptor);
    if (!ok) setDraft(config);
  };

  // Props that turn an input into a "click to sign in" control for visitors.
  const lockProps = canEdit
    ? {}
    : {
        readOnly: true,
        onMouseDown: (e: React.MouseEvent) => {
          e.preventDefault();
          onAuthRequired();
        },
        onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
          e.currentTarget.blur();
          onAuthRequired();
        },
      };

  // --- Title / subtitle -----------------------------------------------------

  const handleTitleBlur = () => {
    if (draft.tableTitle === config.tableTitle) return;
    doCommit(draft, {
      action: "update_title",
      description: `Renamed table to "${draft.tableTitle}"`,
    });
  };

  const handleSubtitleBlur = () => {
    if (draft.tableSubtitle === config.tableSubtitle) return;
    doCommit(draft, {
      action: "update_subtitle",
      description: `Updated the subtitle of "${config.tableTitle}"`,
    });
  };

  // --- Column rename --------------------------------------------------------

  const commitColumnRename = (idx: number) => {
    if (!editingCol || editingCol.idx !== idx) return;
    const newName = editingCol.value.trim();
    const oldName = draft.columns[idx];
    setEditingCol(null);
    if (!newName || newName === oldName) return;
    // Refuse a rename that would collide with another column (would merge data).
    if (draft.columns.some((c, i) => i !== idx && c === newName)) return;

    const newColumns = [...draft.columns];
    newColumns[idx] = newName;
    const newRows = draft.rows.map((row) => {
      const next = { ...row };
      next[newName] = next[oldName] !== undefined ? next[oldName] : "";
      delete next[oldName];
      return next;
    });
    doCommit(
      { ...draft, columns: newColumns, rows: newRows },
      {
        action: "rename_column",
        description: `Renamed column "${oldName}" to "${newName}" in "${config.tableTitle}"`,
      },
    );
  };

  // --- Cells ----------------------------------------------------------------

  const handleCellChange = (rowIndex: number, col: string, value: string) => {
    const originalIndex = filteredRows[rowIndex]?.originalIndex ?? -1;
    if (originalIndex === -1) return;
    const newRows = [...draft.rows];
    newRows[originalIndex] = { ...newRows[originalIndex], [col]: value };
    setDraft({ ...draft, rows: newRows });
  };

  const handleCellBlur = (rowIndex: number, col: string) => {
    const originalIndex = filteredRows[rowIndex]?.originalIndex ?? -1;
    if (originalIndex === -1) return;
    const newVal = String(draft.rows[originalIndex]?.[col] ?? "");
    const oldVal = String(config.rows[originalIndex]?.[col] ?? "");
    if (newVal === oldVal) return;
    doCommit(draft, {
      action: "update_cell",
      description: `Edited "${col}" in row ${originalIndex + 1} of "${config.tableTitle}"`,
    });
  };

  // --- Structural actions (persist immediately) -----------------------------

  const handleAddRow = () => {
    if (!canEdit) return onAuthRequired();
    const newRow: Record<string, unknown> = {};
    draft.columns.forEach((col) => {
      newRow[col] = "";
    });
    doCommit(
      { ...draft, rows: [...draft.rows, newRow] },
      { action: "add_row", description: `Added a row to "${config.tableTitle}"` },
    );
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (!canEdit) return onAuthRequired();
    const originalIndex = filteredRows[rowIndex]?.originalIndex ?? -1;
    if (originalIndex === -1) return;
    const newRows = draft.rows.filter((_, idx) => idx !== originalIndex);
    doCommit(
      { ...draft, rows: newRows },
      {
        action: "delete_row",
        description: `Deleted row ${originalIndex + 1} from "${config.tableTitle}"`,
      },
    );
  };

  const handleAddColumn = () => {
    if (!canEdit) return onAuthRequired();
    const baseName = "New Column";
    let colName = baseName;
    let counter = 1;
    while (draft.columns.includes(colName)) {
      colName = `${baseName} ${counter}`;
      counter++;
    }
    const newColumns = [...draft.columns, colName];
    const newRows = draft.rows.map((row) => ({ ...row, [colName]: "" }));
    doCommit(
      { ...draft, columns: newColumns, rows: newRows },
      {
        action: "add_column",
        description: `Added column "${colName}" to "${config.tableTitle}"`,
      },
    );
  };

  const handleDeleteColumn = (colIdx: number) => {
    if (!canEdit) return onAuthRequired();
    const colName = draft.columns[colIdx];
    const newColumns = draft.columns.filter((_, idx) => idx !== colIdx);
    const newRows = draft.rows.map((row) => {
      const next = { ...row };
      delete next[colName];
      return next;
    });
    doCommit(
      { ...draft, columns: newColumns, rows: newRows },
      {
        action: "delete_column",
        description: `Deleted column "${colName}" from "${config.tableTitle}"`,
      },
    );
  };

  // --- Exports (read-only, available to everyone) ---------------------------

  const handleDownloadCSV = () => {
    const headers = ["S.No.", ...draft.columns];
    const csvRows = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
    ];
    filteredRows.forEach(({ row }, index) => {
      const rowValues = [
        String(index + 1),
        ...draft.columns.map((col) => {
          const val = row[col] !== undefined ? row[col] : "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }),
      ];
      csvRows.push(rowValues.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${draft.id}-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(draft.tableTitle)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px 24px; color: #111827; background-color: #ffffff; }
            .header-container { border-bottom: 2px solid #003366; padding-bottom: 12px; margin-bottom: 24px; }
            h1 { color: #003366; margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
            .subtitle { color: #4b5563; margin: 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 12px; }
            th { background-color: #003366; color: #ffffff; font-weight: 600; }
            tr:nth-child(even) { background-color: #f0f7ff; }
            .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h1>${escapeHtml(draft.tableTitle)}</h1>
            <p class="subtitle">${escapeHtml(draft.tableSubtitle)}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">S.No.</th>
                ${draft.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${filteredRows
                .map(
                  ({ row }, index) => `
                <tr>
                  <td>${index + 1}</td>
                  ${draft.columns.map((col) => `<td>${escapeHtml(row[col])}</td>`).join("")}
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
          <div class="footer">
            Generated from Data Portal | Date: ${new Date().toLocaleDateString()}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --------------------------------------------------------------------------

  return (
    <div className="bg-white border border-gray-200 rounded-none p-6">
      {/* Title & Buttons Row */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 pb-4 mb-4 gap-4">
        <div className="flex-grow w-full md:max-w-xl">
          <label htmlFor={`title-${draft.id}`} className="sr-only">
            Edit Table Title
          </label>
          <input
            id={`title-${draft.id}`}
            type="text"
            value={draft.tableTitle}
            onChange={(e) => setDraft({ ...draft, tableTitle: e.target.value })}
            onBlur={handleTitleBlur}
            {...lockProps}
            className="text-xl font-bold text-[#003366] bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#003366] focus:outline-none w-full"
            placeholder="Table Title"
          />
          <label htmlFor={`subtitle-${draft.id}`} className="sr-only">
            Edit Table Subtitle / Source
          </label>
          <input
            id={`subtitle-${draft.id}`}
            type="text"
            value={draft.tableSubtitle}
            onChange={(e) => setDraft({ ...draft, tableSubtitle: e.target.value })}
            onBlur={handleSubtitleBlur}
            {...lockProps}
            className="text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#003366] focus:outline-none w-full mt-1"
            placeholder="Subtitle / Source"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={handleAddColumn}
            type="button"
            className="px-3 py-1.5 text-xs font-semibold text-[#003366] border border-[#003366] hover:bg-[#003366]/10 transition duration-150 cursor-pointer"
          >
            + Add Column
          </button>
          <button
            onClick={handleAddRow}
            type="button"
            className="px-3 py-1.5 text-xs font-semibold text-[#003366] border border-[#003366] hover:bg-[#003366]/10 transition duration-150 cursor-pointer"
          >
            + Add Row
          </button>
          <button
            onClick={handleDownloadCSV}
            type="button"
            className="px-3 py-1.5 text-xs font-semibold text-[#002244] border border-[#002244] hover:bg-[#002244] hover:text-white transition duration-150 cursor-pointer"
          >
            Download CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            type="button"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#003366] hover:bg-[#002244] transition duration-150 cursor-pointer"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-[#003366] text-white">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold w-16 text-center">
                S.No.
              </th>
              {draft.columns.map((col, idx) => {
                const headerValue =
                  editingCol && editingCol.idx === idx ? editingCol.value : col;
                return (
                  <th
                    key={idx}
                    scope="col"
                    className="px-4 py-3 font-semibold min-w-[150px]"
                  >
                    <div className="flex items-center gap-1 group">
                      <input
                        type="text"
                        value={headerValue}
                        readOnly={!canEdit}
                        onMouseDown={
                          canEdit
                            ? undefined
                            : (e) => {
                                e.preventDefault();
                                onAuthRequired();
                              }
                        }
                        onFocus={
                          canEdit
                            ? () => setEditingCol({ idx, value: col })
                            : (e) => {
                                e.currentTarget.blur();
                                onAuthRequired();
                              }
                        }
                        onChange={(e) =>
                          setEditingCol({ idx, value: e.target.value })
                        }
                        onBlur={() => commitColumnRename(idx)}
                        className="bg-transparent text-white border-b border-transparent hover:border-blue-400 focus:border-white focus:outline-none w-full text-sm font-semibold"
                      />
                      <button
                        onClick={() => handleDeleteColumn(idx)}
                        title="Delete Column"
                        type="button"
                        className="text-red-300 hover:text-red-500 hover:bg-white/10 p-0.5 rounded transition duration-150 ml-1 cursor-pointer"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </th>
                );
              })}
              <th scope="col" className="px-4 py-3 font-semibold w-20 text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredRows.length > 0 ? (
              filteredRows.map(({ row }, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 1 ? "bg-blue-50/50" : "bg-white"}
                >
                  <td className="px-4 py-3 text-center text-gray-500 font-medium">
                    {rowIndex + 1}
                  </td>
                  {draft.columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-3 py-2 text-gray-700">
                      <input
                        type="text"
                        value={row[col] !== undefined ? String(row[col]) : ""}
                        onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                        onBlur={() => handleCellBlur(rowIndex, col)}
                        {...lockProps}
                        className="w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#003366] focus:outline-none px-1 py-0.5 text-sm"
                        placeholder="Empty cell"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleDeleteRow(rowIndex)}
                      title="Delete Row"
                      type="button"
                      className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded transition duration-150 cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4 mx-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={draft.columns.length + 2}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-gray-400 text-right">
        Showing {filteredRows.length} of {draft.rows.length} records
      </div>
    </div>
  );
}
