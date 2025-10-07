import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../services/db.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();

    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    console.log("🚀 Setting up database schema...");
    await connection.query(schema);

    console.log("✅ Database initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

initializeDatabase().catch(console.error);
