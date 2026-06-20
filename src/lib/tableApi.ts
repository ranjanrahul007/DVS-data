import type { TableConfig } from "@/app/tableConfig";
import { portalConfig } from "@/app/tableConfig";

export interface TableSummary {
  id: number;
  name: string;
  sourceFile: string;
  sourceFileType: "xlsx" | "pdf";
  createdAt: string;
  rowCount: number;
  columnCount: number;
}

export interface ImportPreview {
  tableName: string;
  columns: string[];
  rows: string[][];
  totalRows: number;
  totalColumns: number;
  warnings: string[];
  sourceFileType: "xlsx" | "pdf";
  sourceFilename: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_TABLES_API_BASE_URL || "http://localhost:4000/api").replace(
  /\/$/,
  "",
);

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : "Request failed.";
    throw new Error(error);
  }
  return data as T;
}

export async function fetchTableSummaries(): Promise<TableSummary[]> {
  try {
    const response = await fetch(`${API_BASE}/tables`, { cache: "no-store" });
    const data = await parseJson<{ tables: TableSummary[] }>(response);
    return data.tables;
  } catch {
    return portalConfig.tables.map((table, index) => ({
      id: index + 1,
      name: table.tableTitle,
      sourceFile: "local-fallback",
      sourceFileType: "xlsx" as const,
      createdAt: new Date().toISOString(),
      rowCount: table.rows.length,
      columnCount: table.columns.length,
    }));
  }
}

export async function fetchTable(tableId: string, query = ""): Promise<TableConfig> {
  try {
    const url = query.trim()
      ? `${API_BASE}/tables/${tableId}/search?q=${encodeURIComponent(query)}`
      : `${API_BASE}/tables/${tableId}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = await parseJson<{ table: TableConfig }>(response);
    return data.table;
  } catch {
    const fallback = portalConfig.tables[0];
    if (!fallback) throw new Error("No fallback table is available.");
    return {
      ...fallback,
      id: tableId,
      rows: query.trim()
        ? fallback.rows.filter((row) =>
            Object.values(row).some((value) =>
              String(value ?? "").toLowerCase().includes(query.trim().toLowerCase()),
            ),
          )
        : fallback.rows,
    };
  }
}

export async function patchCell(cellId: number, value: string): Promise<void> {
  const response = await fetch(`${API_BASE}/cells/${cellId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  await parseJson<{ ok: true }>(response);
}

export async function createRow(tableId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tables/${tableId}/rows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  await parseJson(response);
}

export async function createColumn(tableId: string, name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tables/${tableId}/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  await parseJson(response);
}

export async function previewImport(file: File): Promise<ImportPreview> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API_BASE}/tables/import`, {
    method: "POST",
    body,
  });
  const data = await parseJson<{ preview: ImportPreview }>(response);
  return data.preview;
}

export async function confirmImport(file: File): Promise<{ id: number; rowCount: number; columnCount: number }> {
  const body = new FormData();
  body.append("file", file);
  body.append("confirm", "true");
  const response = await fetch(`${API_BASE}/tables/import`, {
    method: "POST",
    body,
  });
  return parseJson<{ id: number; rowCount: number; columnCount: number }>(response);
}
