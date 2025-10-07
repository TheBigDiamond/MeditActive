import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "meditactive",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
  namedPlaceholders: true,
  multipleStatements: true,
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Successfully connected to MySQL server");

    const [tables] = await connection.query(
      `
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name IN ('users', 'objectives', 'intervals', 'interval_types', 'user_objectives', 'user_intervals')
    `,
      [process.env.DB_NAME || "meditactive"]
    );

    console.log(`Found ${tables.length} required tables in the database`);

    const [intervalTypes] = await connection.query(`
      SELECT * FROM interval_types
    `);

    if (intervalTypes.length === 0) {
      console.log("No interval types found, creating default ones...");
      await connection.query(`
        INSERT IGNORE INTO interval_types (name, duration_minutes, description) VALUES 
          ('1 hour', 60, 'One hour session'),
          ('1 day', 1440, 'Full day session'),
          ('1 week', 10080, 'One week session');
      `);
      console.log("✅ Created default interval types");
    }

    const [objectives] = await connection.query(`
      SELECT * FROM objectives
    `);

    if (objectives.length === 0) {
      console.log("No objectives found, creating default ones...");
      await connection.query(`
        INSERT IGNORE INTO objectives (title) VALUES 
          ('Weight Loss'),
          ('Muscle Gain'),
          ('Maintenance'),
          ('Endurance'),
          ('Flexibility');
      `);
      console.log("✅ Created default objectives");
    }

    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection error:", error);
    return false;
  }
};

const executeQuery = async (sql, params = []) => {
  const connection = await pool.getConnection();
  try {
    console.log("Executing query:", { sql, params });
    const [results, fields] = await connection.query(sql, params);
    console.log("Query results:", {
      results,
      fields: fields?.map((f) => f.name),
    });
    return results;
  } catch (error) {
    console.error("Query error:", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack,
    });
    throw error;
  } finally {
    connection.release();
  }
};

const executeTransaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export { pool, testConnection, executeQuery, executeTransaction };
