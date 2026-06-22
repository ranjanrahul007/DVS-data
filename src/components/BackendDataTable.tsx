"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TableConfig } from "@/app/tableConfig";
import { createColumn, createRow, fetchTable, patchCell } from "@/lib/tableApi";

interface BackendDataTableProps {
  tableId: string;
  externalSearchQuery?: string;
  canEdit: boolean;
  onAuthRequired: () => void;
}

export default function BackendDataTable({
  tableId,
  externalSearchQuery = "",
  canEdit,
  onAuthRequired,
}: BackendDataTableProps) {
  const [table, setTable] = useState<TableConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredRows, setFilteredRows] = useState<Record<string, unknown>[]>([]);
  const [displayRowIndices, setDisplayRowIndices] = useState<number[]>([]);

  const loadTable = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchTable(tableId);
      setTable(data);
      setError(null);
      setFilteredRows(data.rows);
      setDisplayRowIndices(data.rows.map((_, index) => index));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load table.");
      setTable(null);
      setFilteredRows([]);
      setDisplayRowIndices([]);
    } finally {
      setIsLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      try {
        const data = await fetchTable(tableId);
        if (!active) return;
        setTable(data);
        setError(null);
        setFilteredRows(data.rows);
        setDisplayRowIndices(data.rows.map((_, index) => index));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load table.");
        setTable(null);
        setFilteredRows([]);
        setDisplayRowIndices([]);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tableId]);

  useEffect(() => {
    if (!table) {
      setFilteredRows([]);
      setDisplayRowIndices([]);
      return;
    }

    const query = externalSearchQuery.trim().toLowerCase();
    if (!query) {
      setFilteredRows(table.rows);
      setDisplayRowIndices(table.rows.map((_, index) => index));
      return;
    }

    const filtered: Record<string, unknown>[] = [];
    const indices: number[] = [];

    table.rows.forEach((row, index) => {
      const matches = Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(query),
      );
      if (matches) {
        filtered.push(row);
        indices.push(index);
      }
    });

    setFilteredRows(filtered);
    setDisplayRowIndices(indices);
  }, [externalSearchQuery, table]);

  const updateLocalCell = (rowIndex: number, columnName: string, value: string) => {
    const actualRowIndex = displayRowIndices[rowIndex] ?? rowIndex;
    setTable((current) => {
      if (!current) return current;
      const nextRows = [...current.rows];
      nextRows[actualRowIndex] = { ...nextRows[actualRowIndex], [columnName]: value };
      return { ...current, rows: nextRows };
    });
    setFilteredRows((current) => {
      const nextRows = [...current];
      nextRows[rowIndex] = { ...nextRows[rowIndex], [columnName]: value };
      return nextRows;
    });
  };

  const getCellId = (rowIndex: number, columnName: string) => {
    if (!table?.meta?.rows || !table.meta.columns) return null;
    const tableRowIndex = displayRowIndices[rowIndex];
    const rowMeta = table.meta.rows[tableRowIndex];
    const columnMeta = table.meta.columns.find((column) => column.name === columnName);
    if (!rowMeta || !columnMeta) return null;
    return rowMeta.cellsByColumnId[columnMeta.id]?.id ?? null;
  };

  const handleCellBlur = async (rowIndex: number, columnName: string) => {
    const cellId = getCellId(rowIndex, columnName);
    if (!cellId || !table) return;
    try {
      await patchCell(cellId, String(filteredRows[rowIndex]?.[columnName] ?? ""));
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save cell.");
      void loadTable();
    }
  };

  const handleAddRow = async () => {
    if (!canEdit) return onAuthRequired();
    try {
      await createRow(tableId);
      await loadTable();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add row.");
    }
  };

  const handleAddColumn = async () => {
    if (!canEdit) return onAuthRequired();
    const existing = new Set(table?.columns ?? []);
    const baseName = "New Column";
    let candidate = baseName;
    let counter = 1;
    while (existing.has(candidate)) {
      candidate = `${baseName} ${counter}`;
      counter += 1;
    }
    try {
      await createColumn(tableId, candidate);
      await loadTable();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add column.");
    }
  };

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

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const handleDownloadCSV = () => {
    if (!table) return;
    const headers = ["S.No.", ...table.columns];
    const csvRows = [headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",")];
    table.rows.forEach((row, index) => {
      csvRows.push(
        [
          String(index + 1),
          ...table.columns.map((column) => `"${String(row[column] ?? "").replace(/"/g, '""')}"`),
        ].join(","),
      );
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${table.id}-export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!table) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(table.tableTitle)}</title>
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
            <h1>${escapeHtml(table.tableTitle)}</h1>
            <p class="subtitle">${escapeHtml(table.tableSubtitle)}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">S.No.</th>
                ${table.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${filteredRows
                .map(
                  (row, index) => `
                    <tr>
                      <td>${displayRowIndices[index] + 1}</td>
                      ${table.columns.map((col) => `<td>${escapeHtml(row[col])}</td>`).join("")}
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

  if (isLoading && !table) {
    return (
      <div className="bg-white border border-gray-200 rounded-none p-6">
        <div className="text-sm text-gray-500">Loading table...</div>
      </div>
    );
  }

  if (error && !table) {
    return (
      <div className="bg-white border border-gray-200 rounded-none p-6">
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (!table) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-none p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 pb-4 mb-4 gap-4">
        <div className="flex-grow w-full md:max-w-xl">
          <div className="text-xl font-bold text-[#003366]">{table.tableTitle}</div>
          <div className="text-xs text-gray-500 mt-1">{table.tableSubtitle}</div>
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

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-[#003366] text-white">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold w-16 text-center">
                S.No.
              </th>
              {table.columns.map((col, idx) => (
                <th key={idx} scope="col" className="px-4 py-3 font-semibold min-w-[150px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredRows.length > 0 ? (
              filteredRows.map((row, rowIndex) => (
                <tr key={displayRowIndices[rowIndex]} className={rowIndex % 2 === 1 ? "bg-blue-50/50" : "bg-white"}>
                  <td className="px-4 py-3 text-center text-gray-500 font-medium">
                    {displayRowIndices[rowIndex] + 1}
                  </td>
                  {table.columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-3 py-2 text-gray-700">
                      <input
                        type="text"
                        value={row[col] !== undefined ? String(row[col]) : ""}
                        onChange={(e) => updateLocalCell(rowIndex, col, e.target.value)}
                        onBlur={() => void handleCellBlur(rowIndex, col)}
                        {...lockProps}
                        className="w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#003366] focus:outline-none px-1 py-0.5 text-sm"
                        placeholder="Empty cell"
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={table.columns.length + 1}
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
        Showing {filteredRows.length} of {table.rows.length} records
      </div>
    </div>
  );
}
