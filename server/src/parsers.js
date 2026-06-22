import { read, utils } from "xlsx";
import pdf from "pdf-parse";
import { normalizeImportedGrid } from "./utils.js";

export function parseExcelTable(fileBuffer, fileName) {
  const workbook = read(fileBuffer, { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = utils.sheet_to_json(firstSheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  const normalized = normalizeImportedGrid(rawRows);
  return {
    tableName: fileName.replace(/\.[^.]+$/, ""),
    columns: normalized.columns,
    rows: normalized.rows,
    warnings: [],
  };
}

function splitPdfLine(line) {
  const candidates = [/\t+/, /\s{2,}/, /\s+\|\s+/, /\|/];
  for (const delimiter of candidates) {
    const parts = line.split(delimiter).map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }
  return [line.trim()];
}

export async function parsePdfTable(fileBuffer, fileName) {
  const parsed = await pdf(fileBuffer);
  const lines = parsed.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rawRows = lines
    .map(splitPdfLine)
    .filter((parts) => parts.length > 0);

  const normalized = normalizeImportedGrid(rawRows);

  const warnings = [
    "PDF table extraction is heuristic-based and may misread merged cells, wrapped lines, or tightly spaced columns.",
    "Use the preview before confirming import, especially for PDFs.",
  ];

  return {
    tableName: fileName.replace(/\.[^.]+$/, ""),
    columns: normalized.columns,
    rows: normalized.rows,
    warnings,
  };
}
