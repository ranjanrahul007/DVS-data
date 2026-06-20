import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(rootDir, "migrations", "001_create_custom_tables.sql");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    const sql = await fs.readFile(migrationPath, "utf8");
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await connection.query(`USE \`${process.env.DB_NAME}\``);
    await connection.query(sql);
    console.log("Migration completed successfully.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
