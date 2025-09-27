import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { pool, testConnection } from "./config/db.js";
import userRoutes from "./routes/user.routes.js";

console.log("Testing database connection...");
testConnection().catch((err) => {
  console.error("❌ Failed to connect to the database:", err);
  process.exit(1);
});

const app = express();

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(cors());
app.use(express.json());

const printRoutes = (router, prefix = "") => {
  router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods)
        .join(",")
        .toUpperCase();
      console.log(`${methods.padEnd(7)} ${prefix}${middleware.route.path}`);
    } else if (middleware.name === "router") {
      const path = middleware.regexp
        .toString()
        .replace("/^", "")
        .replace("\\/?", "")
        .replace("(?=\\/|$)", "")
        .replace(/\/(?:[^\/]*)$/, "")
        .replace(/\\([\s\S])|\^\$|\?\??(?:\:\w*)?(?:\{(?:[^}]+)\})?/g, "");

      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods)
            .join(",")
            .toUpperCase();
          console.log(
            `${methods.padEnd(7)} ${prefix}${path}${handler.route.path}`
          );
        }
      });
    }
  });
};

app.on("listening", () => {
  console.log("\nRegistered Routes:");
  printRoutes(app._router);
  console.log("\nServer is running...\n");
});

app.get("/health", async (req, res) => {
  console.log("Health check endpoint called");

  try {
    const [rows] = await pool.query("SELECT 1 as test");
    console.log("Database connection test successful:", rows[0]);

    return res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return res.status(503).json({
      status: "error",
      message: "Database connection failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/test-db-structure", async (req, res) => {
  try {
    const [connectionTest] = await pool.query("SELECT 1 as test");

    const [tables] = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    const usersTable = tables.find(
      (t) => (t.TABLE_NAME || t.table_name).toLowerCase() === "users"
    );

    if (!usersTable) {
      return res.status(500).json({
        status: "error",
        message: "Users table does not exist in the database",
        tables: tables.map((t) => t.TABLE_NAME || t.table_name),
      });
    }

    const [columns] = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'users'
    `);

    let sampleData = [];
    try {
      const [data] = await pool.query("SELECT * FROM users LIMIT 5");
      sampleData = data;
    } catch (dataError) {
      console.error("Error fetching sample data:", dataError);
    }

    res.status(200).json({
      status: "success",
      connection: "OK",
      tables: tables.map((t) => t.TABLE_NAME || t.table_name),
      usersTable: {
        exists: true,
        columns: columns.map((c) => ({
          name: c.COLUMN_NAME || c.column_name,
          type: c.DATA_TYPE || c.data_type,
          nullable: c.IS_NULLABLE === "YES",
          default: c.COLUMN_DEFAULT,
        })),
        sampleData: sampleData,
      },
    });
  } catch (error) {
    console.error("Database structure check failed:", {
      message: error.message,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
    });

    res.status(500).json({
      status: "error",
      message: "Failed to check database structure",
      error:
        process.env.NODE_ENV === "development"
          ? {
              message: error.message,
              code: error.code,
              sql: error.sql,
              sqlMessage: error.sqlMessage,
              sqlState: error.sqlState,
            }
          : undefined,
    });
  }
});

app.get("/test-db-connection", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT 1 as test");
    res.status(200).json({
      status: "success",
      message: "Database connection successful",
      result: result[0],
    });
  } catch (error) {
    console.error("Database connection test failed:", error);
    res.status(500).json({
      status: "Error",
      message: "Database connection failed",
      error: process.env.NODE_ENV === "development" ? error.message : {},
    });
  }
});

app.use("/api/users", userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

const PORT = process.env.PORT || 3001;
const startServer = async () => {
  try {
    await testConnection();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}
