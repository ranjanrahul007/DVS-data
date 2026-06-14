import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Returns the audit log, newest first. The heavy `prevTables` snapshots are
 * stripped out — clients only need to display who changed what and when.
 */
export async function GET() {
  const store = await readStore();
  const history = store.history
    .map((h) => ({
      id: h.id,
      username: h.username,
      action: h.action,
      tableId: h.tableId,
      description: h.description,
      timestamp: h.timestamp,
      revertOf: h.revertOf,
      reverted: h.reverted ?? false,
    }))
    .reverse();
  return NextResponse.json({ history });
}
