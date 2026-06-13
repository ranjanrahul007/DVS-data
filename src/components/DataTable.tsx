"use client";

import React, { useState } from "react";
import { TableConfig } from "@/app/tableConfig";

interface DataTableProps {
  config: TableConfig;
  onUpdate: (updatedConfig: TableConfig) => void;
}

export default function DataTable({ config, onUpdate }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRows = config.rows.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return config.columns.some((col) => {
      const cellValue = row[col];
      if (cellValue === null || cellValue === undefined) return false;
      return String(cellValue).toLowerCase().includes(query);
    });
  });

  const handleTitleChange = (val: string) => {
    onUpdate({ ...config, tableTitle: val });
  };

  const handleSubtitleChange = (val: string) => {
    onUpdate({ ...config, tableSubtitle: val });
  };

  const handleColumnNameChange = (colIdx: number, newName: string) => {
    const oldName = config.columns[colIdx];
    const newColumns = [...config.columns];
    newColumns[colIdx] = newName;

    const newRows = config.rows.map((row) => {
      const newRow = { ...row };
      if (oldName !== newName) {
        newRow[newName] = newRow[oldName] !== undefined ? newRow[oldName] : "";
        delete newRow[oldName];
      }
      return newRow;
    });

    onUpdate({ ...config, columns: newColumns, rows: newRows });
  };

  const handleCellChange = (rowIndex: number, colName: string, value: any) => {
    const originalIndex = config.rows.indexOf(filteredRows[rowIndex]);
    if (originalIndex === -1) return;

    const newRows = [...config.rows];
    newRows[originalIndex] = { ...newRows[originalIndex], [colName]: value };
    onUpdate({ ...config, rows: newRows });
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    config.columns.forEach((col) => {
      newRow[col] = "";
    });
    onUpdate({ ...config, rows: [...config.rows, newRow] });
  };

  const handleDeleteRow = (rowIndex: number) => {
    const originalIndex = config.rows.indexOf(filteredRows[rowIndex]);
    if (originalIndex === -1) return;

    const newRows = config.rows.filter((_, idx) => idx !== originalIndex);
    onUpdate({ ...config, rows: newRows });
  };

  const handleAddColumn = () => {
    const baseName = "New Column";
    let colName = baseName;
    let counter = 1;
    while (config.columns.includes(colName)) {
      colName = `${baseName} ${counter}`;
      counter++;
    }

    const newColumns = [...config.columns, colName];
    const newRows = config.rows.map((row) => ({ ...row, [colName]: "" }));
    onUpdate({ ...config, columns: newColumns, rows: newRows });
  };

  const handleDeleteColumn = (colIdx: number) => {
    const colName = config.columns[colIdx];
    const newColumns = config.columns.filter((_, idx) => idx !== colIdx);
    const newRows = config.rows.map((row) => {
      const newRow = { ...row };
      delete newRow[colName];
      return newRow;
    });
    onUpdate({ ...config, columns: newColumns, rows: newRows });
  };

  const handleDownloadCSV = () => {
    const headers = ["S.No.", ...config.columns];
    const csvRows = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
    ];

    filteredRows.forEach((row, index) => {
      const rowValues = [
        String(index + 1),
        ...config.columns.map((col) => {
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
    link.setAttribute("download", `${config.id}-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${config.tableTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              padding: 40px 24px;
              color: #111827;
              background-color: #ffffff;
            }
            .header-container {
              border-bottom: 2px solid #003366;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            h1 {
              color: #003366;
              margin: 0 0 6px 0;
              font-size: 22px;
              font-weight: 700;
            }
            .subtitle {
              color: #4b5563;
              margin: 0;
              font-size: 13px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 10px 12px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background-color: #003366;
              color: #ffffff;
              font-weight: 600;
            }
            tr:nth-child(even) {
              background-color: #f0f7ff;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #e5e7eb;
              padding-top: 12px;
              font-size: 10px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h1>${config.tableTitle}</h1>
            <p class="subtitle">${config.tableSubtitle}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">S.No.</th>
                ${config.columns.map((col) => `<th>${col}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${filteredRows
                .map(
                  (row, index) => `
                <tr>
                  <td>${index + 1}</td>
                  ${config.columns
                    .map((col) => `<td>${row[col] !== undefined ? row[col] : ""}</td>`)
                    .join("")}
                </tr>
              `
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
              window.onafterprint = function() {
                window.close();
              };
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-none p-6">
      {/* Title & Buttons Row */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 pb-4 mb-4 gap-4">
        <div className="flex-grow w-full md:max-w-xl">
          <label htmlFor={`title-${config.id}`} className="sr-only">
            Edit Table Title
          </label>
          <input
            id={`title-${config.id}`}
            type="text"
            value={config.tableTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-xl font-bold text-[#003366] bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#003366] focus:outline-none w-full"
            placeholder="Table Title"
          />
          <label htmlFor={`subtitle-${config.id}`} className="sr-only">
            Edit Table Subtitle / Source
          </label>
          <input
            id={`subtitle-${config.id}`}
            type="text"
            value={config.tableSubtitle}
            onChange={(e) => handleSubtitleChange(e.target.value)}
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

      {/* Filter / Search Input */}
      <div className="mb-4">
        <label htmlFor={`search-${config.id}`} className="sr-only">
          Search Table
        </label>
        <input
          id={`search-${config.id}`}
          type="text"
          placeholder="Search within table..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-80 px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
        />
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-[#003366] text-white">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold w-16 text-center">
                S.No.
              </th>
              {config.columns.map((col, idx) => (
                <th key={idx} scope="col" className="px-4 py-3 font-semibold min-w-[150px]">
                  <div className="flex items-center gap-1 group">
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => handleColumnNameChange(idx, e.target.value)}
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
              ))}
              <th scope="col" className="px-4 py-3 font-semibold w-20 text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredRows.length > 0 ? (
              filteredRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 1 ? "bg-blue-50/50" : "bg-white"}
                >
                  <td className="px-4 py-3 text-center text-gray-500 font-medium">
                    {rowIndex + 1}
                  </td>
                  {config.columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-3 py-2 text-gray-700">
                      <input
                        type="text"
                        value={row[col] !== undefined ? String(row[col]) : ""}
                        onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
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
                  colSpan={config.columns.length + 2}
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
        Showing {filteredRows.length} of {config.rows.length} records
      </div>
    </div>
  );
}
