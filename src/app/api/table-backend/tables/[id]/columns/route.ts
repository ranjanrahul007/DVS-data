import { NextResponse } from "next/server";
import { addFallbackColumn } from "../../../../../../../server/src/fallback-store.js";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { name?: unknown };
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Column name is required." }, { status: 400 });
    }

    const column = await addFallbackColumn(id, name);
    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add column." },
      { status: 500 },
    );
  }
}
