import path from "path";

export function normalizeCellValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function inferFileType(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (
    extension === ".xlsx" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx";
  }
  if (extension === ".pdf" || file.mimetype === "application/pdf") {
    return "pdf";
  }
  return null;
}

export function trimTrailingEmptyColumns(rows) {
  let lastNonEmptyIndex = -1;
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      if (normalizeCellValue(cell) !== "") lastNonEmptyIndex = Math.max(lastNonEmptyIndex, index);
    });
  });

  return rows.map((row) => row.slice(0, lastNonEmptyIndex + 1));
}

export function trimTrailingEmptyRows(rows) {
  const copy = [...rows];
  while (copy.length > 0 && copy[copy.length - 1].every((cell) => normalizeCellValue(cell) === "")) {
    copy.pop();
  }
  return copy;
}

export function normalizeImportedGrid(rawRows) {
  const trimmedRows = trimTrailingEmptyRows(trimTrailingEmptyColumns(rawRows));
  if (trimmedRows.length === 0) {
    return { columns: [], rows: [] };
  }

  const width = Math.max(...trimmedRows.map((row) => row.length));
  const paddedRows = trimmedRows.map((row) => {
    const next = [...row];
    while (next.length < width) next.push("");
    return next.map(normalizeCellValue);
  });

  const headers = paddedRows[0].map((header, index) => header || `Column ${index + 1}`);
  const uniqueHeaders = [];
  const seen = new Map();
  for (const header of headers) {
    const count = seen.get(header) || 0;
    seen.set(header, count + 1);
    uniqueHeaders.push(count === 0 ? header : `${header} ${count + 1}`);
  }

  return {
    columns: uniqueHeaders,
    rows: paddedRows.slice(1),
  };
}
