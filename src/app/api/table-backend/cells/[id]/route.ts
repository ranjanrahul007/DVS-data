import { NextResponse } from "next/server";
import { updateFallbackCell } from "../../../../../../server/src/fallback-store.js";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { value?: unknown };
    const ok = await updateFallbackCell(id, String(body.value ?? ""));
    if (!ok) {
      return NextResponse.json({ error: "Cell not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update cell." },
      { status: 500 },
    );
  }
}
