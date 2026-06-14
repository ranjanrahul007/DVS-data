import type { TableConfig } from "@/app/tableConfig";

export type { TableConfig };

/** A registered CMS user. Passwords are never stored in plaintext. */
export interface User {
  id: string;
  username: string;
  /** Hex-encoded scrypt hash of the password. */
  passwordHash: string;
  /** Hex-encoded random salt used for the hash. */
  salt: string;
  createdAt: string;
}

/** Public-safe view of a user (never includes credentials). */
export interface PublicUser {
  id: string;
  username: string;
}

export type HistoryAction =
  | "update_cell"
  | "add_row"
  | "delete_row"
  | "add_column"
  | "delete_column"
  | "rename_column"
  | "update_title"
  | "update_subtitle"
  | "add_table"
  | "delete_table"
  | "reset"
  | "revert";

/**
 * A single audit-log entry. `prevTables` is a full snapshot of the tables
 * *before* the change was applied, which is what makes a clean revert possible.
 */
export interface HistoryEntry {
  id: string;
  username: string;
  action: HistoryAction;
  /** The table affected, or null for portal-wide actions (reset). */
  tableId: string | null;
  /** Human-readable summary, e.g. `Edited "City" in row 3 of Census Data`. */
  description: string;
  timestamp: string;
  /** Snapshot of all tables immediately before this change. */
  prevTables: TableConfig[];
  /** If this entry is a revert, the id of the history entry it undid. */
  revertOf?: string;
  /** Set to true once a later revert has rolled this change back. */
  reverted?: boolean;
}

/** The complete persisted state of the CMS. */
export interface Store {
  users: User[];
  tables: TableConfig[];
  history: HistoryEntry[];
}
