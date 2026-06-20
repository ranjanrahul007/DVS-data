import { pool, withTransaction } from "./db.js";
import { normalizeCellValue } from "./utils.js";
import {
  addFallbackColumn,
  addFallbackRow,
  getFallbackTableById,
  insertFallbackTable,
  listFallbackTables,
  searchFallbackRows,
  updateFallbackCell,
} from "./fallback-store.js";

const USE_FALLBACK =
  process.env.DB_USER === "your_mysql_user" ||
  process.env.DB_PASSWORD === "your_mysql_password" ||
  process.env.TABLES_STORAGE_MODE === "file";

export async function insertImportedTable(payload, source) {
  if (USE_FALLBACK) {
    return insertFallbackTable(payload, source);
  }
  return withTransaction(async (connection) => {
    const [tableResult] = await connection.query(
      `INSERT INTO imported_tables (name, source_filename, source_file_type)
       VALUES (?, ?, ?)`,
      [payload.tableName, source.filename, source.fileType],
    );
    const tableId = tableResult.insertId;

    const columnIds = [];
    for (const [index, columnName] of payload.columns.entries()) {
      const [columnResult] = await connection.query(
        `INSERT INTO table_columns (table_id, name, order_index) VALUES (?, ?, ?)`,
        [tableId, columnName, index],
      );
      columnIds.push({ id: columnResult.insertId, name: columnName, orderIndex: index });
    }

    for (const [rowIndex, row] of payload.rows.entries()) {
      const [rowResult] = await connection.query(
        `INSERT INTO table_rows (table_id, row_number) VALUES (?, ?)`,
        [tableId, rowIndex + 1],
      );
      const rowId = rowResult.insertId;

      for (const [columnIndex, cellValue] of row.entries()) {
        await connection.query(
          `INSERT INTO table_cells (row_id, column_id, value) VALUES (?, ?, ?)`,
          [rowId, columnIds[columnIndex].id, normalizeCellValue(cellValue)],
        );
      }
    }

    return {
      id: tableId,
      rowCount: payload.rows.length,
      columnCount: payload.columns.length,
    };
  });
}

export async function listTables() {
  if (USE_FALLBACK) {
    return listFallbackTables();
  }
  const [rows] = await pool.query(
    `SELECT
       t.id,
       t.name,
       t.source_filename AS sourceFile,
       t.source_file_type AS sourceFileType,
       t.created_at AS createdAt,
       COUNT(DISTINCT r.id) AS rowCount,
       COUNT(DISTINCT c.id) AS columnCount
     FROM imported_tables t
     LEFT JOIN table_rows r ON r.table_id = t.id
     LEFT JOIN table_columns c ON c.table_id = t.id
     GROUP BY t.id
     ORDER BY t.created_at DESC, t.id DESC`,
  );
  return rows;
}

export async function getTableById(tableId, filteredRowIds = null) {
  if (USE_FALLBACK) {
    return getFallbackTableById(tableId, filteredRowIds);
  }
  const [tableRows] = await pool.query(
    `SELECT id, name, source_filename AS sourceFile, source_file_type AS sourceFileType, created_at AS createdAt
     FROM imported_tables WHERE id = ?`,
    [tableId],
  );
  const table = tableRows[0];
  if (!table) return null;

  const [columns] = await pool.query(
    `SELECT id, name, order_index AS orderIndex
     FROM table_columns
     WHERE table_id = ?
     ORDER BY order_index ASC`,
    [tableId],
  );

  const hasRowFilter = Array.isArray(filteredRowIds);
  const filterClause = hasRowFilter
    ? filteredRowIds.length > 0
      ? `AND r.id IN (${filteredRowIds.map(() => "?").join(",")})`
      : "AND 1 = 0"
    : "";
  const params = hasRowFilter && filteredRowIds.length > 0 ? [tableId, ...filteredRowIds] : [tableId];

  const [cells] = await pool.query(
    `SELECT
       r.id AS rowId,
       r.row_number AS rowNumber,
       c.id AS columnId,
       c.name AS columnName,
       c.order_index AS columnOrder,
       cell.id AS cellId,
       cell.value AS cellValue
     FROM table_rows r
     JOIN table_columns c ON c.table_id = r.table_id
     LEFT JOIN table_cells cell ON cell.row_id = r.id AND cell.column_id = c.id
     WHERE r.table_id = ?
     ${filterClause}
     ORDER BY r.row_number ASC, c.order_index ASC`,
    params,
  );

  const rowsById = new Map();
  for (const entry of cells) {
    if (!rowsById.has(entry.rowId)) {
      rowsById.set(entry.rowId, {
        id: entry.rowId,
        rowNumber: entry.rowNumber,
        values: {},
        cellsByColumnId: {},
      });
    }
    const row = rowsById.get(entry.rowId);
    row.values[entry.columnName] = entry.cellValue ?? "";
    row.cellsByColumnId[entry.columnId] = {
      id: entry.cellId,
      value: entry.cellValue ?? "",
    };
  }

  const rowItems = [...rowsById.values()];
  return {
    id: String(table.id),
    tableTitle: table.name,
    tableSubtitle: `Source: ${table.sourceFile} (${table.sourceFileType.toUpperCase()})`,
    sourceFile: table.sourceFile,
    sourceFileType: table.sourceFileType,
    createdAt: table.createdAt,
    columns: columns.map((column) => column.name),
    rows: rowItems.map((row) => row.values),
    meta: {
      columns,
      rows: rowItems,
    },
  };
}

export async function updateCell(cellId, value) {
  if (USE_FALLBACK) {
    return updateFallbackCell(cellId, value);
  }
  const [result] = await pool.query(`UPDATE table_cells SET value = ? WHERE id = ?`, [
    normalizeCellValue(value),
    cellId,
  ]);
  return result.affectedRows > 0;
}

export async function addColumn(tableId, name) {
  if (USE_FALLBACK) {
    return addFallbackColumn(tableId, name);
  }
  return withTransaction(async (connection) => {
    const [[maxOrder]] = await connection.query(
      `SELECT COALESCE(MAX(order_index), -1) AS maxOrder FROM table_columns WHERE table_id = ?`,
      [tableId],
    );
    const nextOrder = Number(maxOrder.maxOrder) + 1;
    const [columnResult] = await connection.query(
      `INSERT INTO table_columns (table_id, name, order_index) VALUES (?, ?, ?)`,
      [tableId, name, nextOrder],
    );
    const columnId = columnResult.insertId;

    const [rows] = await connection.query(`SELECT id FROM table_rows WHERE table_id = ?`, [tableId]);
    for (const row of rows) {
      await connection.query(
        `INSERT INTO table_cells (row_id, column_id, value) VALUES (?, ?, '')`,
        [row.id, columnId],
      );
    }

    return { id: columnId, name, orderIndex: nextOrder };
  });
}

export async function addRow(tableId) {
  if (USE_FALLBACK) {
    return addFallbackRow(tableId);
  }
  return withTransaction(async (connection) => {
    const [[maxRow]] = await connection.query(
      `SELECT COALESCE(MAX(row_number), 0) AS maxRow FROM table_rows WHERE table_id = ?`,
      [tableId],
    );
    const nextRowNumber = Number(maxRow.maxRow) + 1;
    const [rowResult] = await connection.query(
      `INSERT INTO table_rows (table_id, row_number) VALUES (?, ?)`,
      [tableId, nextRowNumber],
    );
    const rowId = rowResult.insertId;

    const [columns] = await connection.query(`SELECT id FROM table_columns WHERE table_id = ?`, [tableId]);
    for (const column of columns) {
      await connection.query(
        `INSERT INTO table_cells (row_id, column_id, value) VALUES (?, ?, '')`,
        [rowId, column.id],
      );
    }

    return { id: rowId, rowNumber: nextRowNumber };
  });
}

export async function searchTableRows(tableId, query) {
  if (USE_FALLBACK) {
    return searchFallbackRows(tableId, query);
  }
  const searchTerm = query.trim();
  if (!searchTerm) return [];

  const [rows] = await pool.query(
    `SELECT
       r.id AS rowId,
       MIN(
         CASE
           WHEN UPPER(c.name) LIKE '%NAME%' AND UPPER(COALESCE(cell.value, '')) LIKE CONCAT(UPPER(?), '%') THEN 0
           WHEN UPPER(c.name) LIKE '%NAME%' AND UPPER(COALESCE(cell.value, '')) LIKE CONCAT('%', UPPER(?), '%') THEN 1
           WHEN UPPER(COALESCE(cell.value, '')) LIKE CONCAT(UPPER(?), '%') THEN 2
           WHEN UPPER(COALESCE(cell.value, '')) LIKE CONCAT('%', UPPER(?), '%') THEN 3
           ELSE 99
         END
       ) AS matchRank
     FROM table_rows r
     JOIN table_cells cell ON cell.row_id = r.id
     JOIN table_columns c ON c.id = cell.column_id
     WHERE r.table_id = ?
       AND UPPER(COALESCE(cell.value, '')) LIKE CONCAT('%', UPPER(?), '%')
     GROUP BY r.id
     ORDER BY matchRank ASC, r.row_number ASC`,
    [searchTerm, searchTerm, searchTerm, searchTerm, tableId, searchTerm],
  );
  return rows.map((row) => row.rowId);
}
