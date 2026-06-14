import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { mutate, readStore } from "@/lib/store";
import { validateTables } from "@/lib/validate";
import { portalConfig } from "@/app/tableConfig";
import type { HistoryAction, HistoryEntry } from "@/lib/types";

export const runtime = "nodejs";

const VALID_ACTIONS: HistoryAction[] = [
  "update_cell",
  "add_row",
  "delete_row",
  "add_column",
  "delete_column",
  "rename_column",
  "update_title",
  "update_subtitle",
  "add_table",
  "delete_table",
  "reset",
];

const MAX_DESCRIPTION = 300;

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ tables: store.tables });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be signed in to edit data." },
      { status: 401 },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { action, tableId, description, tables } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof action !== "string" || !VALID_ACTIONS.includes(action as HistoryAction))
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const desc =
    typeof description === "string"
      ? description.slice(0, MAX_DESCRIPTION)
      : action;

  // For a reset we ignore the client payload and restore the seed defaults
  // server-side, so a reset can never be used to inject arbitrary data.
  let nextTables;
  if (action === "reset") {
    nextTables = JSON.parse(JSON.stringify(portalConfig.tables));
  } else {
    const validated = validateTables(tables);
    if (!Array.isArray(validated))
      return NextResponse.json({ error: validated.error }, { status: 400 });
    nextTables = validated;
  }

  const result = await mutate((store) => {
    const entry: HistoryEntry = {
      id: randomUUID(),
      username: user.username,
      action: action as HistoryAction,
      tableId: typeof tableId === "string" ? tableId : null,
      description: desc,
      timestamp: new Date().toISOString(),
      prevTables: store.tables,
    };
    store.history.push(entry);
    store.tables = nextTables;
    return { tables: store.tables, entry };
  });

  return NextResponse.json({ tables: result.tables });
}
