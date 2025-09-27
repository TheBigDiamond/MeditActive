import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "meditactive",
  connectTimeout: 5000,
};

console.log("Testing database connection with config:", {
  ...dbConfig,
  password: dbConfig.password ? "***" : "(no password)",
});

async function testConnection() {
  let connection;
  try {
    console.log("\n1. Testing basic MySQL connection...");
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: dbConfig.connectTimeout,
    });

    console.log("✅ Successfully connected to MySQL server");

    console.log("\n2. Listing available databases...");
    const [dbs] = await connection.query("SHOW DATABASES");
    console.log(
      "Available databases:",
      dbs.map((db) => db.Database)
    );

    if (dbConfig.database) {
      console.log(`\n3. Checking if database '${dbConfig.database}' exists...`);
      const [rows] = await connection.query(
        "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
        [dbConfig.database]
      );

      if (rows.length > 0) {
        console.log(`✅ Database '${dbConfig.database}' exists`);

        await connection.query(`USE ${dbConfig.database}`);

        console.log("\n4. Checking tables in the database...");
        const [tables] = await connection.query("SHOW TABLES");
        console.log(`Found ${tables.length} tables:`, tables);

        if (tables.some((t) => t.Tables_in_meditactive === "users")) {
          console.log("✅ Users table exists");

          const [columns] = await connection.query("DESCRIBE users");
          console.log("\nUsers table structure:");
          console.table(
            columns.map((col) => ({
              Field: col.Field,
              Type: col.Type,
              Null: col.Null,
              Key: col.Key,
              Default: col.Default,
              Extra: col.Extra,
            }))
          );

          const [[{ count }]] = await connection.query(
            "SELECT COUNT(*) as count FROM users"
          );
          console.log(`\nNumber of users in the database: ${count}`);
        } else {
          console.log("❌ Users table does not exist");
        }
      } else {
        console.log(`❌ Database '${dbConfig.database}' does not exist`);
      }
    }
  } catch (error) {
    console.error("\n❌ Connection failed:", {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      message: error.message,
    });

    if (error.code === "ECONNREFUSED") {
      console.error("\n🔴 MySQL server is not running or not accessible.");
      console.error(
        "   Please check if MySQL server is running and accessible at",
        `${dbConfig.host}:${dbConfig.port}`
      );
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("\n🔴 Access denied for the specified MySQL user.");
      console.error(
        "   Please check your username and password in the .env file."
      );
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error(`\n🔴 Database '${dbConfig.database}' does not exist.`);
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n🔌 Connection closed");
    }
  }
}

testConnection().catch(console.error);
