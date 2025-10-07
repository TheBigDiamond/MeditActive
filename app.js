import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { testConnection } from "./config/db.js";
import { executeQuery } from "./services/db.service.js";
import userRoutes from "./routes/user.routes.js";

const initializeDatabase = async () => {
  try {
    console.log("Testing database connection...");
    await testConnection();

    await executeQuery(`
      INSERT IGNORE INTO interval_types (name, duration_minutes, description) VALUES 
        ('1 hour', 60, 'One hour session'),
        ('1 day', 1440, 'Full day session'),
        ('1 week', 10080, 'One week session');
    `);

    await executeQuery(`
      INSERT IGNORE INTO objectives (title) VALUES 
        ('Weight Loss'),
        ('Muscle Gain'),
        ('Maintenance'),
        ('Endurance'),
        ('Flexibility');
    `);

    console.log("✅ Database initialized successfully");
  } catch (err) {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  }
};

const app = express();

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ` +
        `${res.statusCode} ${duration}ms`
    );
  });

  next();
});

app.use(cors());

app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    platform: process.platform,
    memoryUsage: process.memoryUsage(),
  });
});

import objectivesRoutes from "./routes/objectives.routes.js";
import intervalTypesRoutes from "./routes/intervalTypes.routes.js";

app.use("/api/users", userRoutes);
app.use("/api/objectives", objectivesRoutes);
app.use("/api/interval-types", intervalTypesRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  const errorId =
    Date.now().toString(36) + Math.random().toString(36).substr(2);

  console.error(`[${errorId}] Unhandled error:`, err);

  if (err.errors && Array.isArray(err.errors)) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.errors.map((e) => e.msg || e.message || e),
      errorId,
      timestamp: new Date().toISOString(),
    });
  }

  if (
    err.code === "ER_DUP_ENTRY" ||
    (err.message && err.message.includes("Duplicate entry"))
  ) {
    return res.status(409).json({
      status: "error",
      message: "Duplicate entry",
      field: err.sqlMessage?.match(/key '(.+?)'/)?.[1] || "unknown",
      errorId,
      timestamp: new Date().toISOString(),
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production" && statusCode === 500
        ? "Internal server error"
        : err.message || "An unexpected error occurred",
    errorId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
      ...(err.details && { details: err.details }),
    }),
  });
});

const printRoutes = (router, prefix = "") => {
  if (!router || !router.stack) return;

  router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods)
        .join(",")
        .toUpperCase();
      console.log(`${methods.padEnd(7)} ${prefix}${middleware.route.path}`);
    } else if (
      middleware.name === "router" &&
      middleware.handle &&
      middleware.handle.stack
    ) {
      let route = "";

      if (middleware.regexp) {
        route = middleware.regexp
          .toString()
          .replace("^", "")
          .replace("\\/?", "")
          .replace("(?=\\/|$)", "")
          .replace(/\/(?:[^\/]*)$/, "")
          .replace(/\\([\s\S])|\^\$|\?\??(?:\:\w*)?(?:\{(?:[^}]+)\})?/g, "");
      }

      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods)
            .join(",")
            .toUpperCase();
          const path = handler.route.path === "/" ? "" : handler.route.path;
          console.log(`${methods.padEnd(7)} ${prefix}${route}${path}`);
        } else if (
          handler.name === "router" &&
          handler.handle &&
          handler.handle.stack
        ) {
          printRoutes(handler, `${prefix}${route}`);
        }
      });
    }
  });
};

const startServer = async () => {
  try {
    await initializeDatabase();

    const PORT = process.env.PORT || 3001;
    const server = app.listen(PORT, () => {
      console.log(`\nServer is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("\nRegistered Routes:");
      printRoutes(app._router);
      console.log("\nEndpoints:");
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API Base URL: http://localhost:${PORT}/api/users`);
      console.log("\nPress Ctrl+C to stop the server\n");
    });

    process.on("unhandledRejection", (err) => {
      console.error("Unhandled Rejection:", err);
      if (server) {
        server.close(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
      if (server) {
        server.close(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Shutting down gracefully");
      if (server) {
        server.close(() => {
          console.log("Process terminated");
          process.exit(0);
        });
      }
    });

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error("Fatal error during server startup:", error);
    process.exit(1);
  });
}

export { app, startServer };
