import { NextResponse } from "next/server";
import { listFallbackTables } from "../../../../../server/src/fallback-store.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const tables = await listFallbackTables();
    return NextResponse.json({ tables });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not list tables." },
      { status: 500 },
    );
  }
}
