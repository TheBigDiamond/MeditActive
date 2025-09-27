import { pool } from "../config/db.js";

const User = {
  async findAll() {
    try {
      console.log("Executing User.findAll()");
      const [rows] = await pool.query("SELECT * FROM users LIMIT 5");
      console.log("Query successful, found", rows.length, "users");
      return { data: rows };
    } catch (error) {
      console.error("Error in User.findAll():", {
        message: error.message,
        code: error.code,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
      });
      throw error;
    }
  },
};

export default User;
