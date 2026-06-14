import type { TableConfig } from "@/app/tableConfig";

/** Shared input validation for auth and table endpoints. */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;

const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;

export function validateUsername(value: unknown): string | { error: string } {
  if (typeof value !== "string") return { error: "Username is required." };
  const username = value.trim();
  if (username.length < USERNAME_MIN)
    return { error: `Username must be at least ${USERNAME_MIN} characters.` };
  if (username.length > USERNAME_MAX)
    return { error: `Username must be at most ${USERNAME_MAX} characters.` };
  if (!USERNAME_RE.test(username))
    return { error: "Username may only contain letters, numbers, and . _ -" };
  return username;
}

export function validatePassword(value: unknown): string | { error: string } {
  if (typeof value !== "string") return { error: "Password is required." };
  if (value.length < PASSWORD_MIN)
    return { error: `Password must be at least ${PASSWORD_MIN} characters.` };
  if (value.length > PASSWORD_MAX)
    return { error: `Password must be at most ${PASSWORD_MAX} characters.` };
  return value;
}

/** Maximum sizes to bound the persisted payload and avoid abuse. */
const MAX_TABLES = 100;
const MAX_COLUMNS = 100;
const MAX_ROWS = 5000;

/**
 * Validates and normalises a tables payload coming from the client. Returns the
 * cleaned tables array, or an `{ error }` describing the first problem found.
 */
export function validateTables(value: unknown): TableConfig[] | { error: string } {
  if (!Array.isArray(value)) return { error: "Tables payload must be an array." };
  if (value.length > MAX_TABLES) return { error: "Too many tables." };

  const tables: TableConfig[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return { error: "Invalid table entry." };
    const t = raw as Record<string, unknown>;

    if (typeof t.id !== "string" || !t.id) return { error: "Table is missing an id." };
    if (typeof t.tableTitle !== "string") return { error: "Invalid table title." };
    if (typeof t.tableSubtitle !== "string") return { error: "Invalid table subtitle." };
    if (!Array.isArray(t.columns)) return { error: "Invalid columns." };
    if (t.columns.length > MAX_COLUMNS) return { error: "Too many columns." };
    if (!t.columns.every((c) => typeof c === "string"))
      return { error: "Column names must be strings." };
    if (!Array.isArray(t.rows)) return { error: "Invalid rows." };
    if (t.rows.length > MAX_ROWS) return { error: "Too many rows." };

    const rows: Record<string, unknown>[] = [];
    for (const row of t.rows) {
      if (!row || typeof row !== "object" || Array.isArray(row))
        return { error: "Invalid row." };
      rows.push(row as Record<string, unknown>);
    }

    tables.push({
      id: t.id,
      tableTitle: t.tableTitle,
      tableSubtitle: t.tableSubtitle,
      columns: t.columns as string[],
      rows: rows as TableConfig["rows"],
    });
  }
  return tables;
}
