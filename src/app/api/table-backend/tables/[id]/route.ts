import { NextResponse } from "next/server";
import { getFallbackTableById } from "../../../../../../server/src/fallback-store.js";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const table = await getFallbackTableById(id);
    if (!table) {
      return NextResponse.json({ error: "Table not found." }, { status: 404 });
    }
    return NextResponse.json({ table });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load table." },
      { status: 500 },
    );
  }
}
