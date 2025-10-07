import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "meditactive",
  multipleStatements: true,
};

async function checkDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log("✅ Successfully connected to the database");

    const [users] = await connection.execute('SHOW TABLES LIKE "users"');
    console.log("Users table exists:", users.length > 0);

    const [objectives] = await connection.execute(
      "SELECT * FROM objectives LIMIT 5"
    );
    console.log("Objectives:", objectives);

    const [intervalTypes] = await connection.execute(
      "SELECT * FROM interval_types"
    );
    console.log("Interval Types:", intervalTypes);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.sqlMessage) console.error("SQL Message:", error.sqlMessage);
  } finally {
    if (connection) await connection.end();
  }
}

checkDatabase().catch(console.error);
