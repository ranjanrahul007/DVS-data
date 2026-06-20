import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "tables.json");

function createEmptyStore() {
  return {
    nextTableId: 1,
    nextColumnId: 1,
    nextRowId: 1,
    nextCellId: 1,
    tables: [],
  };
}

async function ensureStore() {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(createEmptyStore(), null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeStore(store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function listFallbackTables() {
  const store = await readStore();
  return store.tables
    .map((table) => ({
      id: table.id,
      name: table.name,
      sourceFile: table.sourceFile,
      sourceFileType: table.sourceFileType,
      createdAt: table.createdAt,
      rowCount: table.rows.length,
      columnCount: table.columns.length,
    }))
    .sort((a, b) => Number(b.id) - Number(a.id));
}

export async function insertFallbackTable(payload, source) {
  const store = await readStore();
  const createdAt = new Date().toISOString();
  const tableId = store.nextTableId++;

  const columns = payload.columns.map((name, index) => ({
    id: store.nextColumnId++,
    name,
    orderIndex: index,
  }));

  const rows = payload.rows.map((rowValues, index) => {
    const rowId = store.nextRowId++;
    const values = {};
    const cellsByColumnId = {};
    columns.forEach((column, columnIndex) => {
      const cellId = store.nextCellId++;
      const value = String(rowValues[columnIndex] ?? "");
      values[column.name] = value;
      cellsByColumnId[column.id] = { id: cellId, value };
    });
    return {
      id: rowId,
      rowNumber: index + 1,
      values,
      cellsByColumnId,
    };
  });

  store.tables.push({
    id: tableId,
    name: payload.tableName,
    sourceFile: source.filename,
    sourceFileType: source.fileType,
    createdAt,
    columns,
    rows,
  });

  await writeStore(store);

  return {
    id: tableId,
    rowCount: rows.length,
    columnCount: columns.length,
  };
}

function shapeFallbackTable(table, rowFilter = null) {
  const rows = Array.isArray(rowFilter)
    ? table.rows.filter((row) => rowFilter.includes(row.id))
    : table.rows;

  return {
    id: String(table.id),
    tableTitle: table.name,
    tableSubtitle: `Source: ${table.sourceFile} (${table.sourceFileType.toUpperCase()})`,
    sourceFile: table.sourceFile,
    sourceFileType: table.sourceFileType,
    createdAt: table.createdAt,
    columns: table.columns.map((column) => column.name),
    rows: rows.map((row) => row.values),
    meta: {
      columns: table.columns,
      rows: rows.map((row) => ({
        id: row.id,
        rowNumber: row.rowNumber,
        cellsByColumnId: row.cellsByColumnId,
      })),
    },
  };
}

export async function getFallbackTableById(tableId, rowFilter = null) {
  const store = await readStore();
  const table = store.tables.find((entry) => String(entry.id) === String(tableId));
  if (!table) return null;
  return shapeFallbackTable(table, rowFilter);
}

export async function updateFallbackCell(cellId, value) {
  const store = await readStore();
  for (const table of store.tables) {
    for (const row of table.rows) {
      for (const column of table.columns) {
        const cell = row.cellsByColumnId[column.id];
        if (cell?.id === Number(cellId)) {
          const nextValue = String(value ?? "");
          cell.value = nextValue;
          row.values[column.name] = nextValue;
          await writeStore(store);
          return true;
        }
      }
    }
  }
  return false;
}

export async function addFallbackColumn(tableId, name) {
  const store = await readStore();
  const table = store.tables.find((entry) => String(entry.id) === String(tableId));
  if (!table) throw new Error("Table not found.");

  const column = {
    id: store.nextColumnId++,
    name,
    orderIndex: table.columns.length,
  };
  table.columns.push(column);

  for (const row of table.rows) {
    const cellId = store.nextCellId++;
    row.values[name] = "";
    row.cellsByColumnId[column.id] = { id: cellId, value: "" };
  }

  await writeStore(store);
  return column;
}

export async function addFallbackRow(tableId) {
  const store = await readStore();
  const table = store.tables.find((entry) => String(entry.id) === String(tableId));
  if (!table) throw new Error("Table not found.");

  const row = {
    id: store.nextRowId++,
    rowNumber: table.rows.length + 1,
    values: {},
    cellsByColumnId: {},
  };

  for (const column of table.columns) {
    const cellId = store.nextCellId++;
    row.values[column.name] = "";
    row.cellsByColumnId[column.id] = { id: cellId, value: "" };
  }

  table.rows.push(row);
  await writeStore(store);
  return { id: row.id, rowNumber: row.rowNumber };
}

export async function searchFallbackRows(tableId, query) {
  const store = await readStore();
  const table = store.tables.find((entry) => String(entry.id) === String(tableId));
  if (!table) return [];

  const term = query.trim().toLowerCase();
  if (!term) return table.rows.map((row) => row.id);

  const nameColumns = table.columns
    .filter((column) => column.name.toLowerCase().includes("name"))
    .map((column) => column.name);

  const ranked = table.rows
    .map((row) => {
      const values = Object.entries(row.values).map(([columnName, value]) => ({
        columnName,
        value: String(value ?? "").toLowerCase(),
      }));
      const nameValues = values.filter((entry) => nameColumns.includes(entry.columnName));

      const rankGroup = (entries) => {
        if (entries.some((entry) => entry.value.startsWith(term))) return 0;
        if (entries.some((entry) => entry.value.includes(term))) return 1;
        return Number.POSITIVE_INFINITY;
      };

      const nameRank = rankGroup(nameValues);
      const allRank = rankGroup(values);
      const rank = Number.isFinite(nameRank) ? nameRank : allRank + 2;
      return { id: row.id, rowNumber: row.rowNumber, rank };
    })
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((a, b) => a.rank - b.rank || a.rowNumber - b.rowNumber);

  return ranked.map((entry) => entry.id);
}
