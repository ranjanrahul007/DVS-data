CREATE TABLE IF NOT EXISTS imported_tables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  source_filename VARCHAR(255) NOT NULL,
  source_file_type ENUM('xlsx', 'pdf') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_imported_tables_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS table_columns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  order_index INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_table_columns_table_order (table_id, order_index),
  KEY idx_table_columns_table (table_id),
  KEY idx_table_columns_name (name),
  CONSTRAINT fk_table_columns_table
    FOREIGN KEY (table_id) REFERENCES imported_tables(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS table_rows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_id BIGINT UNSIGNED NOT NULL,
  row_number INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_table_rows_table_row_number (table_id, row_number),
  KEY idx_table_rows_table (table_id),
  CONSTRAINT fk_table_rows_table
    FOREIGN KEY (table_id) REFERENCES imported_tables(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS table_cells (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  row_id BIGINT UNSIGNED NOT NULL,
  column_id BIGINT UNSIGNED NOT NULL,
  value TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_table_cells_row_column (row_id, column_id),
  KEY idx_table_cells_row_column (row_id, column_id),
  KEY idx_table_cells_column_row (column_id, row_id),
  KEY idx_table_cells_value_prefix (value(191)),
  FULLTEXT KEY ft_table_cells_value (value),
  CONSTRAINT fk_table_cells_row
    FOREIGN KEY (row_id) REFERENCES table_rows(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_table_cells_column
    FOREIGN KEY (column_id) REFERENCES table_columns(id)
    ON DELETE CASCADE
);
