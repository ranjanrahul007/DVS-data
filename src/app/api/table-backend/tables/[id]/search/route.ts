import { NextResponse } from "next/server";
import {
  getFallbackTableById,
  searchFallbackRows,
} from "../../../../../../../server/src/fallback-store.js";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const query = String(searchParams.get("q") || "");
    const rowIds = await searchFallbackRows(id, query);
    const table = await getFallbackTableById(id, rowIds);
    if (!table) {
      return NextResponse.json({ error: "Table not found." }, { status: 404 });
    }
    return NextResponse.json({ table, matchCount: rowIds.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not search table." },
      { status: 500 },
    );
  }
}
