import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { mutate } from "@/lib/store";
import type { HistoryEntry } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be signed in to revert changes." },
      { status: 401 },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { historyId } = (body ?? {}) as Record<string, unknown>;
  if (typeof historyId !== "string")
    return NextResponse.json({ error: "historyId is required." }, { status: 400 });

  const result = await mutate((store) => {
    const target = store.history.find((h) => h.id === historyId);
    if (!target) return { error: "not_found" as const };

    // The state we are leaving — recorded so the revert itself can be reverted.
    const before = store.tables;

    // Restore the snapshot captured just before the target change.
    store.tables = JSON.parse(JSON.stringify(target.prevTables));
    target.reverted = true;

    const entry: HistoryEntry = {
      id: randomUUID(),
      username: user.username,
      action: "revert",
      tableId: target.tableId,
      description: `Reverted "${target.description}" (originally by ${target.username})`,
      timestamp: new Date().toISOString(),
      prevTables: before,
      revertOf: target.id,
    };
    store.history.push(entry);
    return { tables: store.tables };
  });

  if ("error" in result)
    return NextResponse.json({ error: "History entry not found." }, { status: 404 });

  return NextResponse.json({ tables: result.tables });
}
