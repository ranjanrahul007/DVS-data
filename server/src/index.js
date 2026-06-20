import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { inferFileType } from "./utils.js";
import { parseExcelTable, parsePdfTable } from "./parsers.js";
import {
  addColumn,
  addRow,
  getTableById,
  insertImportedTable,
  listTables,
  searchTableRows,
  updateCell,
} from "./table-service.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = Number(process.env.PORT || 4000);
const storageMode =
  process.env.DB_USER === "your_mysql_user" ||
  process.env.DB_PASSWORD === "your_mysql_password" ||
  process.env.TABLES_STORAGE_MODE === "file"
    ? "file"
    : "mysql";

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH"],
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, storageMode });
});

app.post("/api/tables/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const fileType = inferFileType(req.file);
    if (!fileType) {
      return res.status(400).json({ error: "Only .xlsx and .pdf files are supported." });
    }

    const parsed =
      fileType === "xlsx"
        ? parseExcelTable(req.file.buffer, req.file.originalname)
        : await parsePdfTable(req.file.buffer, req.file.originalname);

    if (!parsed.columns.length) {
      return res.status(400).json({ error: "Could not detect any table columns in the uploaded file." });
    }

    const confirmImport = String(req.body.confirm || "false").toLowerCase() === "true";
    if (!confirmImport) {
      return res.json({
        preview: {
          tableName: parsed.tableName,
          columns: parsed.columns,
          rows: parsed.rows.slice(0, 10),
          totalRows: parsed.rows.length,
          totalColumns: parsed.columns.length,
          warnings: parsed.warnings,
          sourceFileType: fileType,
          sourceFilename: req.file.originalname,
        },
      });
    }

    const inserted = await insertImportedTable(parsed, {
      filename: req.file.originalname,
      fileType,
    });

    return res.status(201).json(inserted);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Import failed.",
    });
  }
});

app.get("/api/tables", async (_req, res) => {
  try {
    const tables = await listTables();
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not list tables." });
  }
});

app.get("/api/tables/:id", async (req, res) => {
  try {
    const table = await getTableById(req.params.id);
    if (!table) {
      return res.status(404).json({ error: "Table not found." });
    }
    return res.json({ table });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not load table." });
  }
});

app.patch("/api/cells/:id", async (req, res) => {
  try {
    const ok = await updateCell(req.params.id, req.body.value ?? "");
    if (!ok) {
      return res.status(404).json({ error: "Cell not found." });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not update cell." });
  }
});

app.post("/api/tables/:id/columns", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Column name is required." });
    }
    const column = await addColumn(req.params.id, name);
    return res.status(201).json({ column });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not add column." });
  }
});

app.post("/api/tables/:id/rows", async (req, res) => {
  try {
    const row = await addRow(req.params.id);
    return res.status(201).json({ row });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not add row." });
  }
});

app.get("/api/tables/:id/search", async (req, res) => {
  try {
    const query = String(req.query.q || "");
    const rowIds = await searchTableRows(req.params.id, query);
    const table = await getTableById(req.params.id, rowIds);
    if (!table) {
      return res.status(404).json({ error: "Table not found." });
    }
    return res.json({ table, matchCount: rowIds.length });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not search table." });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port} using ${storageMode} storage`);
});
