import { NextResponse } from "next/server";
import { insertFallbackTable } from "../../../../../../server/src/fallback-store.js";
import { inferFileType } from "../../../../../../server/src/utils.js";
import { parseExcelTable, parsePdfTable } from "../../../../../../server/src/parsers.js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const inferredType = inferFileType({
      originalname: file.name,
      mimetype: file.type,
    });

    if (!inferredType) {
      return NextResponse.json(
        { error: "Only .xlsx and .pdf files are supported." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed =
      inferredType === "xlsx"
        ? parseExcelTable(buffer, file.name)
        : await parsePdfTable(buffer, file.name);

    if (!parsed.columns.length) {
      return NextResponse.json(
        { error: "Could not detect any table columns in the uploaded file." },
        { status: 400 },
      );
    }

    const confirmImport = String(formData.get("confirm") || "false").toLowerCase() === "true";
    if (!confirmImport) {
      return NextResponse.json({
        preview: {
          tableName: parsed.tableName,
          columns: parsed.columns,
          rows: parsed.rows.slice(0, 10),
          totalRows: parsed.rows.length,
          totalColumns: parsed.columns.length,
          warnings: parsed.warnings,
          sourceFileType: inferredType,
          sourceFilename: file.name,
        },
      });
    }

    const inserted = await insertFallbackTable(parsed, {
      filename: file.name,
      fileType: inferredType,
    });

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 500 },
    );
  }
}
