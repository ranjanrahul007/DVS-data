import { NextResponse } from "next/server";
import { addFallbackRow } from "../../../../../../../server/src/fallback-store.js";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const row = await addFallbackRow(id);
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add row." },
      { status: 500 },
    );
  }
}
