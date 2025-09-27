import { pool } from "../config/db.js";

const User = {
  async findAll({ limit = 10, offset = 0 } = {}) {
    const requestId = Date.now();
    console.log(`\n=== [${requestId}] FIND ALL USERS ===`);
    console.log(`[${requestId}] Query parameters:`, { limit, offset });

    let connection;
    try {      const safeLimit = Math.min(parseInt(limit, 10) || 10, 100);
      const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

      console.log(`[${requestId}] Safe query values:`, {
        limit: safeLimit,
        offset: safeOffset,
      });

      console.log(`[${requestId}] Getting database connection from pool...`);
      connection = await pool.getConnection();
      console.log(`[${requestId}] ✅ Database connection established`);

      console.log(`[${requestId}] Fetching total user count...`);
      const [countResult] = await connection.query(
        "SELECT COUNT(*) as total FROM users"
      );
      const total = countResult[0]?.total || 0;
      console.log(`[${requestId}] ✅ Total users in database: ${total}`);

      const query = `
        SELECT 
          id, 
          first_name as "firstName", 
          last_name as "lastName", 
          email,
          obiettivo,
          data_inizio as "dataInizio",
          data_fine as "dataFine"
        FROM users
        ORDER BY id
        LIMIT ? OFFSET ?
      `;

      console.log(
        `[${requestId}] Executing query:`,
        query.replace(/\s+/g, " ").trim()
      );
      console.log(`[${requestId}] With values:`, [safeLimit, safeOffset]);

      const [rows] = await connection.query(query, [safeLimit, safeOffset]);
      console.log(`[${requestId}] ✅ Retrieved ${rows.length} users`);

      const result = {
        data: rows,
        pagination: {
          total: parseInt(total, 10),
          limit: safeLimit,
          offset: safeOffset,
          hasMore: safeOffset + rows.length < total,
        },
        requestId,
      };

      console.log(`[${requestId}] ✅ Query completed successfully`);
      return result;
    } catch (error) {
      console.error(`[${requestId}] ❌ Error in User.findAll():`, {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        message: error.message,
        sql: error.sql,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      const dbError = new Error("Failed to fetch users");
      dbError.originalError = error;
      dbError.code = error.code;
      dbError.sqlMessage = error.sqlMessage;
      dbError.requestId = requestId;
      throw dbError;
    } finally {
      if (connection) {
        try {
          await connection.release();
          console.log(`[${requestId}] ✅ Database connection released`);
        } catch (releaseError) {
          console.error(`[${requestId}] ❌ Error releasing connection:`, {
            message: releaseError.message,
            stack: releaseError.stack,
          });
        }
      }
    }
  },

  async findById(id) {
    const requestId = Date.now();
    console.log(`\n=== [${requestId}] FIND USER BY ID ===`);
    console.log(`[${requestId}] User ID:`, id);

    let connection;
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new Error("Invalid user ID");
      }

      console.log(`[${requestId}] Getting database connection from pool...`);
      connection = await pool.getConnection();
      console.log(`[${requestId}] ✅ Database connection established`);

      const query = `
        SELECT 
          id, 
          first_name as "firstName", 
          last_name as "lastName", 
          email,
          obiettivo,
          data_inizio as "dataInizio",
          data_fine as "dataFine"
        FROM users 
        WHERE id = ?
      `;

      console.log(
        `[${requestId}] Executing query:`,
        query.replace(/\s+/g, " ").trim()
      );
      console.log(`[${requestId}] With values:`, [userId]);

      const [rows] = await connection.query(query, [userId]);

      if (rows.length === 0) {
        throw new Error(`No user found with ID: ${id}`);
      }

      console.log(`[${requestId}] ✅ Found user:`, rows[0]);
      return rows[0];
    } catch (error) {
      console.error(`[${requestId}] ❌ Error in User.findById():`, {
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.release();
          console.log(`[${requestId}] ✅ Database connection released`);
        } catch (releaseError) {
          console.error(`[${requestId}] ❌ Error releasing connection:`, {
            message: releaseError.message,
            stack: releaseError.stack,
          });
        }
      }
    }
  },

  async create(userData) {
    const requestId = Date.now();
    console.log(`\n=== [${requestId}] CREATE USER ===`);
    console.log(`[${requestId}] User data:`, userData);

    let connection;
    try {
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "obiettivo",
        "dataInizio",
        "dataFine",
      ];
      const missingFields = requiredFields.filter((field) => !userData[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      console.log(`[${requestId}] Getting database connection from pool...`);
      connection = await pool.getConnection();
      console.log(`[${requestId}] ✅ Database connection established`);

      const query = `
        INSERT INTO users 
        (first_name, last_name, email, obiettivo, data_inizio, data_fine)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const values = [
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.obiettivo,
        userData.dataInizio,
        userData.dataFine,
      ];

      console.log(
        `[${requestId}] Executing query:`,
        query.replace(/\s+/g, " ").trim()
      );
      console.log(`[${requestId}] With values:`, values);

      const [result] = await connection.query(query, values);

      if (result.affectedRows === 0) {
        throw new Error("Failed to create user: No rows affected");
      }

      const [newUser] = await connection.query(
        "SELECT * FROM users WHERE id = ?",
        [result.insertId]
      );

      if (newUser.length === 0) {
        throw new Error("Failed to retrieve created user");
      }

      console.log(
        `[${requestId}] ✅ User created successfully with ID:`,
        result.insertId
      );

      const createdUser = {
        id: newUser[0].id,
        firstName: newUser[0].first_name,
        lastName: newUser[0].last_name,
        email: newUser[0].email,
        obiettivo: newUser[0].obiettivo,
        dataInizio: newUser[0].data_inizio,
        dataFine: newUser[0].data_fine,
      };

      return createdUser;
    } catch (error) {
      console.error(`[${requestId}] ❌ Error in User.create():`, {
        message: error.message,
        code: error.code,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      if (error.code === "ER_DUP_ENTRY") {
        const dupError = new Error("Email already exists");
        dupError.code = "DUPLICATE_EMAIL";
        throw dupError;
      }

      throw error;
    } finally {
      if (connection) {
        try {
          await connection.release();
          console.log(`[${requestId}] ✅ Database connection released`);
        } catch (releaseError) {
          console.error(`[${requestId}] ❌ Error releasing connection:`, {
            message: releaseError.message,
            stack: releaseError.stack,
          });
        }
      }
    }
  },

  async update(id, userData) {
    const requestId = Date.now();
    console.log(`\n=== [${requestId}] UPDATE USER ===`);
    console.log(`[${requestId}] Updating user ID:`, id);
    console.log(`[${requestId}] Update data:`, userData);

    let connection;
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new Error("Invalid user ID");
      }

      console.log(`[${requestId}] Getting database connection from pool...`);
      connection = await pool.getConnection();
      console.log(`[${requestId}] ✅ Database connection established`);

      await connection.beginTransaction();

      try {
        const [currentUser] = await connection.query(
          "SELECT * FROM users WHERE id = ?",
          [userId]
        );

        if (currentUser.length === 0) {
          throw new Error(`User with ID ${userId} not found`);
        }

        const updateFields = [];
        const values = [];

        const fieldMap = {
          firstName: "first_name",
          lastName: "last_name",
          email: "email",
          obiettivo: "obiettivo",
          dataInizio: "data_inizio",
          dataFine: "data_fine",
        };

        Object.entries(userData).forEach(([key, value]) => {
          if (key in fieldMap && value !== undefined) {
            updateFields.push(`${fieldMap[key]} = ?`);
            values.push(value);
          }
        });

        if (updateFields.length === 0) {
          throw new Error("No valid fields to update");
        }

        values.push(userId);

        const query = `
          UPDATE users 
          SET ${updateFields.join(", ")}
          WHERE id = ?
        `;

        console.log(
          `[${requestId}] Executing query:`,
          query.replace(/\s+/g, " ").trim()
        );
        console.log(`[${requestId}] With values:`, values);

        const [result] = await connection.query(query, values);

        if (result.affectedRows === 0) {
          throw new Error("No rows were updated");
        }

        const [updatedUser] = await connection.query(
          'SELECT id, first_name as "firstName", last_name as "lastName", email, obiettivo, data_inizio as "dataInizio", data_fine as "dataFine" FROM users WHERE id = ?',
          [userId]
        );

        if (updatedUser.length === 0) {
          throw new Error("Failed to fetch updated user data");
        }

        await connection.commit();

        console.log(`[${requestId}] ✅ User updated successfully`);
        return updatedUser[0];
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error(`[${requestId}] ❌ Error in User.update():`, {
        message: error.message,
        code: error.code,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      if (error.code === "ER_DUP_ENTRY") {
        const dupError = new Error("Email already exists");
        dupError.code = "DUPLICATE_EMAIL";
        throw dupError;
      }

      throw error;
    } finally {
      if (connection) {
        try {
          await connection.release();
          console.log(`[${requestId}] ✅ Database connection released`);
        } catch (releaseError) {
          console.error(`[${requestId}] ❌ Error releasing connection:`, {
            message: releaseError.message,
            stack: releaseError.stack,
          });
        }
      }
    }
  },

  async delete(id) {
    const requestId = Date.now();
    console.log(`\n=== [${requestId}] DELETE USER ===`);
    console.log(`[${requestId}] Deleting user ID:`, id);

    let connection;
    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new Error("Invalid user ID");
      }

      console.log(`[${requestId}] Getting database connection from pool...`);
      connection = await pool.getConnection();
      console.log(`[${requestId}] ✅ Database connection established`);

      await connection.beginTransaction();

      try {
        const [userToDelete] = await connection.query(
          'SELECT id, first_name as "firstName", last_name as "lastName", email, obiettivo, data_inizio as "dataInizio", data_fine as "dataFine" FROM users WHERE id = ?',
          [userId]
        );

        if (userToDelete.length === 0) {
          throw new Error(`User with ID ${userId} not found`);
        }

        const [result] = await connection.query(
          "DELETE FROM users WHERE id = ?",
          [userId]
        );

        if (result.affectedRows === 0) {
          throw new Error("No rows were deleted");
        }

        await connection.commit();

        console.log(`[${requestId}] ✅ User deleted successfully`);
        return userToDelete[0];
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error(`[${requestId}] ❌ Error in User.delete():`, {
        message: error.message,
        code: error.code,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      throw error;
    } finally {
      if (connection) {
        try {
          await connection.release();
          console.log(`[${requestId}] ✅ Database connection released`);
        } catch (releaseError) {
          console.error(`[${requestId}] ❌ Error releasing connection:`, {
            message: releaseError.message,
            stack: releaseError.stack,
          });
        }
      }
    }
  },
};

export default User;
