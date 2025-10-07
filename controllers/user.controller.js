import {
  pool,
  executeQuery,
  executeTransaction,
} from "../services/db.service.js";
import { validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";

const handleError = (res, error, requestId) => {
  console.error(`[${requestId}] ❌ Error:`, error);

  const statusCode = error.statusCode || 500;
  const response = {
    status: "error",
    message: error.message || "An unexpected error occurred",
    errorId: `err_${requestId}`,
    requestId,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development") {
    response.error = error.message;
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

export const getAllUsers = async (req, res) => {
  const requestId = Date.now();
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const { objective, startDate, endDate } = req.query;

  try {
    let query = "SELECT DISTINCT u.* FROM users u";
    const queryParams = [];
    const whereClauses = [];
    const countParams = [];
    if (objective) {
      query += " JOIN user_objectives uo ON u.id = uo.user_id";
      query += " JOIN objectives o ON uo.objective_id = o.id";
      whereClauses.push("o.title = ?");
      queryParams.push(objective);
      countParams.push(objective);
    }

    if (startDate || endDate) {
      query += " JOIN user_intervals ui ON u.id = ui.user_id";
      query += " JOIN intervals i ON ui.interval_id = i.id";

      if (startDate) {
        whereClauses.push("i.start_date >= ?");
        queryParams.push(startDate);
        countParams.push(startDate);
      }
      if (endDate) {
        whereClauses.push("i.end_date <= ?");
        queryParams.push(endDate);
        countParams.push(endDate);
      }
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }
    query += " GROUP BY u.id";
    queryParams.push(limit, offset);
    query += " LIMIT ? OFFSET ?";
    const users = await executeQuery(query, queryParams);
    let countQuery = "SELECT COUNT(DISTINCT u.id) as total FROM users u";

    if (objective) {
      countQuery += " JOIN user_objectives uo ON u.id = uo.user_id";
      countQuery += " JOIN objectives o ON uo.objective_id = o.id";
    }

    if (startDate || endDate) {
      countQuery += " JOIN user_intervals ui ON u.id = ui.user_id";
      countQuery += " JOIN intervals i ON ui.interval_id = i.id";
    }

    const countWhereClauses = [];
    if (objective) {
      countWhereClauses.push("o.title = ?");
    }
    if (startDate) {
      countWhereClauses.push("i.start_date >= ?");
    }
    if (endDate) {
      countWhereClauses.push("i.end_date <= ?");
    }

    if (countWhereClauses.length > 0) {
      countQuery += " WHERE " + countWhereClauses.join(" AND ");
    }

    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult && countResult[0] ? countResult[0].total : 0;

    const usersWithRelations = await Promise.all(
      users.map(async (user) => {
        const objectivesResult = await executeQuery(
          `SELECT o.* FROM objectives o
         JOIN user_objectives uo ON o.id = uo.objective_id
         WHERE uo.user_id = ?`,
          [user.id]
        );

        let objectives = [];
        if (objectivesResult && Array.isArray(objectivesResult[0])) {
          objectives = objectivesResult[0];
        } else if (Array.isArray(objectivesResult)) {
          objectives = objectivesResult;
        }

        const objectiveTitles = objectives
          .map((obj) => {
            if (typeof obj === "object" && obj !== null) {
              return obj.title || obj.name || String(obj);
            }
            return String(obj);
          })
          .filter(Boolean);

        let intervalQuery = `
        SELECT i.*, it.name as interval_type_name, it.duration_minutes 
        FROM intervals i
        JOIN interval_types it ON i.interval_type_id = it.id
        JOIN user_intervals ui ON i.id = ui.interval_id
        WHERE ui.user_id = ?
      `;

        const intervalParams = [user.id];

        if (startDate) {
          intervalQuery += " AND i.start_date >= ?";
          intervalParams.push(startDate);
        }
        if (endDate) {
          intervalQuery += " AND i.end_date <= ?";
          intervalParams.push(endDate);
        }

        const intervals = await executeQuery(intervalQuery, intervalParams);

        return {
          ...user,
          objectives: objectiveTitles,
          intervals: Array.isArray(intervals) ? intervals : [],
        };
      })
    );

    return res.json({
      status: "success",
      data: usersWithRelations,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + users.length < total,
      },
      requestId,
    });
  } catch (error) {
    return handleError(res, error, requestId);
  }
};

export const getUserById = async (req, res) => {
  const requestId = Date.now();
  const { id } = req.params;

  try {
    const users = await executeQuery("SELECT * FROM users WHERE id = ?", [id]);

    if (!users || users.length === 0 || !users[0]) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
        requestId,
      });
    }

    const user = users[0];

    const objectives = await executeQuery(
      `SELECT o.* FROM objectives o
       JOIN user_objectives uo ON o.id = uo.objective_id
       WHERE uo.user_id = ?`,
      [id]
    );

    const intervals = await executeQuery(
      `SELECT i.*, it.name as interval_type_name, it.duration_minutes 
       FROM intervals i
       JOIN interval_types it ON i.interval_type_id = it.id
       JOIN user_intervals ui ON i.id = ui.interval_id
       WHERE ui.user_id = ?`,
      [id]
    );

    const response = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      objectives: Array.isArray(objectives)
        ? objectives
            .map((obj) => obj.title || obj.name || String(obj))
            .filter(Boolean)
        : [],
      intervals: Array.isArray(intervals) ? intervals : [],
    };

    return res.json({
      status: "success",
      data: response,
      requestId,
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    return handleError(res, error, requestId);
  }
};

export const createUser = async (req, res) => {
  const requestId = Date.now();
  console.log(`\n=== [${requestId}] CREATE USER REQUEST ===`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errors.array(),
        requestId,
      });
    }

    const {
      firstName,
      lastName,
      email,
      objectives = [],
      intervals = [],
    } = req.body;
    console.log("Creating user with data:", {
      firstName,
      lastName,
      email,
      objectives,
      intervals,
    });

    console.log("Checking if email exists:", email);
    const [existingUsers] = await executeQuery(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    console.log("Existing users query result:", existingUsers);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Email already in use",
        requestId,
      });
    }

    const userId = await executeTransaction(async (connection) => {
      const [result] = await connection.execute(
        "INSERT INTO users (first_name, last_name, email) VALUES (?, ?, ?)",
        [firstName, lastName, email]
      );

      const userId = result.insertId;

      if (objectives && objectives.length > 0) {
        const objectiveValues = [];

        for (const objective of objectives) {
          const isNumber = !isNaN(parseInt(objective));

          let objectiveId;

          if (isNumber) {
            const [existingById] = await connection.execute(
              "SELECT id FROM objectives WHERE id = ?",
              [objective]
            );

            if (existingById.length === 0) {
              console.warn(
                `Objective with ID ${objective} not found, skipping`
              );
              continue;
            }
            objectiveId = existingById[0].id;
          } else {
            const [existingByTitle] = await connection.execute(
              "SELECT id FROM objectives WHERE title = ?",
              [objective]
            );

            if (existingByTitle.length === 0) {
              console.warn(
                `Objective with title "${objective}" not found, skipping`
              );
              continue;
            }
            objectiveId = existingByTitle[0].id;
          }

          objectiveValues.push([userId, objectiveId]);
        }

        if (objectiveValues.length > 0) {
          await connection.query(
            "INSERT INTO user_objectives (user_id, objective_id) VALUES ?",
            [objectiveValues]
          );
        }
      }

      if (intervals && intervals.length > 0) {
        const intervalValues = [];
        const now = new Date();

        for (const intervalTypeId of intervals) {
          const [intervalType] = await connection.execute(
            "SELECT duration_minutes FROM interval_types WHERE id = ?",
            [intervalTypeId]
          );

          if (intervalType.length === 0) {
            console.warn(
              `Interval type with ID ${intervalTypeId} not found, skipping`
            );
            continue;
          }

          const durationMinutes = intervalType[0].duration_minutes;
          const startDate = now;
          const endDate = new Date(
            startDate.getTime() + durationMinutes * 60000
          );

          const [result] = await connection.execute(
            `INSERT INTO intervals 
             (start_date, end_date, interval_type_id) 
             VALUES (?, ?, ?)`,
            [startDate, endDate, intervalTypeId]
          );

          intervalValues.push([userId, result.insertId]);
        }

        if (intervalValues.length > 0) {
          await connection.query(
            "INSERT INTO user_intervals (user_id, interval_id) VALUES ?",
            [intervalValues]
          );
        }
      }

      return userId;
    });

    const [users] = await executeQuery("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (!users || users.length === 0) {
      throw new Error("Failed to retrieve created user");
    }

    const response = {
      ...users[0],
      objectives: [],
      intervals: [],
      requestId,
    };

    const [objectivesData] = await executeQuery(
      `SELECT o.* FROM objectives o
       JOIN user_objectives uo ON o.id = uo.objective_id
       WHERE uo.user_id = ?`,
      [userId]
    );

    const [intervalsData] = await executeQuery(
      `SELECT i.*, it.name as interval_type_name, it.duration_minutes 
       FROM intervals i
       JOIN interval_types it ON i.interval_type_id = it.id
       JOIN user_intervals ui ON i.id = ui.interval_id
       WHERE ui.user_id = ?`,
      [userId]
    );

    response.objectives = objectivesData || [];
    response.intervals = intervalsData || [];

    return res.status(201).json({
      status: "success",
      data: response,
      requestId,
    });
  } catch (error) {
    console.error("Error in createUser:", error);
    return handleError(res, error, requestId);
  }
};

export const updateUser = async (req, res) => {
  const requestId = Date.now();
  const { id } = req.params;

  try {
    const [users] = await executeQuery("SELECT id FROM users WHERE id = ?", [
      id,
    ]);
    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
        requestId,
      });
    }

    const { firstName, lastName, email, objectives, intervals } = req.body;

    await executeTransaction(async (connection) => {
      console.log("Starting user update with data:", { id, ...req.body });
      const updateFields = [];
      const updateValues = [];

      if (firstName) {
        updateFields.push("first_name = ?");
        updateValues.push(firstName);
      }
      if (lastName) {
        updateFields.push("last_name = ?");
        updateValues.push(lastName);
      }
      if (email) {
        const [existing] = await connection.execute(
          "SELECT id FROM users WHERE email = ? AND id != ?",
          [email, id]
        );

        if (existing.length > 0) {
          const error = new Error("Email already in use by another user");
          error.statusCode = 409;
          throw error;
        }

        updateFields.push("email = ?");
        updateValues.push(email);
      }

      if (updateFields.length > 0) {
        updateValues.push(id);

        await connection.execute(
          `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
          updateValues
        );
      }

      if (objectives) {
        await connection.execute(
          "DELETE FROM user_objectives WHERE user_id = ?",
          [id]
        );

        if (objectives.length > 0) {
          const objectiveValues = [];

          for (const objectiveId of objectives) {
            const [existing] = await connection.execute(
              "SELECT id FROM objectives WHERE id = ?",
              [objectiveId]
            );

            if (existing.length > 0) {
              objectiveValues.push([id, objectiveId]);
            } else {
              console.warn(
                `Objective with ID ${objectiveId} not found, skipping`
              );
            }
          }

          if (objectiveValues.length > 0) {
            await connection.query(
              "INSERT INTO user_objectives (user_id, objective_id) VALUES ?",
              [objectiveValues]
            );
          }
        }
      }

      if (intervals !== undefined) {
        console.log("Processing intervals:", intervals);

        console.log("Deleting existing intervals for user:", id);
        await connection.query("DELETE FROM user_intervals WHERE user_id = ?", [
          id,
        ]);

        if (Array.isArray(intervals) && intervals.length > 0) {
          console.log(`Adding ${intervals.length} new intervals`);

          for (const interval of intervals) {
            try {
              let intervalTypeId, startDate, endDate;

              if (
                typeof interval === "number" ||
                (typeof interval === "string" && !isNaN(interval))
              ) {
                intervalTypeId = parseInt(interval, 10);
                startDate = new Date();

                const [intervalType] = await connection.execute(
                  "SELECT * FROM interval_types WHERE id = ?",
                  [intervalTypeId]
                );

                if (intervalType && intervalType.length > 0) {
                  const durationMs =
                    intervalType[0].duration_minutes * 60 * 1000;
                  endDate = new Date(startDate.getTime() + durationMs);
                  console.log(
                    `Set interval: ${intervalType[0].name} (${durationMs}ms)`
                  );
                } else {
                  console.warn(
                    `Interval type with ID ${intervalTypeId} not found, using default duration`
                  );
                  endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour
                }
              } else if (typeof interval === "object" && interval !== null) {
                intervalTypeId = parseInt(
                  interval.intervalTypeId || interval.interval_type_id,
                  10
                );
                startDate = interval.startDate
                  ? new Date(interval.startDate)
                  : new Date();
                endDate = interval.endDate
                  ? new Date(interval.endDate)
                  : new Date();

                if (isNaN(startDate.getTime())) startDate = new Date();
                if (isNaN(endDate.getTime()))
                  endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

                const [intervalType] = await connection.execute(
                  "SELECT 1 FROM interval_types WHERE id = ?",
                  [intervalTypeId]
                );

                if (!intervalType || intervalType.length === 0) {
                  console.warn(
                    `Interval type with ID ${intervalTypeId} not found, skipping`
                  );
                  continue;
                }
              } else {
                console.warn("Invalid interval format, skipping:", interval);
                continue;
              }

              console.log("Inserting interval with:", {
                startDate,
                endDate,
                intervalTypeId,
              });

              const [result] = await connection.execute(
                `INSERT INTO intervals 
                 (start_date, end_date, interval_type_id) 
                 VALUES (?, ?, ?)`,
                [startDate, endDate, intervalTypeId]
              );

              if (result && result.insertId) {
                await connection.execute(
                  "INSERT INTO user_intervals (user_id, interval_id) VALUES (?, ?)",
                  [id, result.insertId]
                );
                console.log(
                  `Created and linked interval ${result.insertId} for user ${id}`
                );
              } else {
                console.error(
                  "Failed to insert interval, no insertId returned"
                );
              }
            } catch (error) {
              console.error("Error processing interval:", interval, error);
            }
          }
        } else {
          console.log("No intervals provided, only clearing existing ones");
        }
      }
    });

    // After successful update, fetch the complete user data with relationships
    try {
      const [users] = await executeQuery(
        `SELECT id, first_name, last_name, email FROM users WHERE id = ?`,
        [id]
      );

      if (!users || users.length === 0) {
        console.error("User not found after update, ID:", id);
        return res.status(404).json({
          status: "error",
          message: "User not found after update",
          requestId,
        });
      }

      const userData = users[0];

      const objectives = await executeQuery(
        `SELECT o.title 
         FROM user_objectives uo
         JOIN objectives o ON uo.objective_id = o.id 
         WHERE uo.user_id = ?`,
        [id]
      );

      const intervals = await executeQuery(
        `SELECT 
           i.id,
           i.start_date,
           i.end_date,
           i.interval_type_id,
           it.name as interval_type_name,
           it.duration_minutes
         FROM user_intervals ui
         JOIN intervals i ON ui.interval_id = i.id
         JOIN interval_types it ON i.interval_type_id = it.id
         WHERE ui.user_id = ?`,
        [id]
      );

      console.log(
        "Raw intervals from database:",
        JSON.stringify(intervals, null, 2)
      );

      const rawIntervals = await executeQuery(
        "SELECT * FROM user_intervals WHERE user_id = ?",
        [id]
      );
      console.log(
        "Raw user_intervals data:",
        JSON.stringify(rawIntervals, null, 2)
      );

      const allIntervals = await executeQuery("SELECT * FROM intervals");
      console.log(
        "All intervals in database:",
        JSON.stringify(allIntervals, null, 2)
      );

      const formattedData = {
        ...userData,
        objectives: Array.isArray(objectives)
          ? objectives.map((o) => o.title).filter(Boolean)
          : [],
        intervals: Array.isArray(intervals)
          ? intervals.map((i) => ({
              id: i.id,
              startDate: i.start_date,
              endDate: i.end_date,
              intervalTypeId: i.interval_type_id,
              intervalTypeName: i.interval_type_name,
              durationMinutes: i.duration_minutes,
            }))
          : [],
      };

      console.log("Formatted user data:", formattedData);

      return res.json({
        status: "success",
        data: formattedData,
        requestId,
      });
    } catch (error) {
      console.error("Error fetching updated user data:", error);
      return res.status(500).json({
        status: "error",
        message: "Error fetching updated user data",
        error: error.message,
        requestId,
      });
    }
  } catch (error) {
    console.error("Error in updateUser:", error);
    return handleError(res, error, requestId);
  }
};

export const getObjectives = async (req, res) => {
  const requestId = Date.now();

  try {
    const query = "SELECT * FROM objectives ORDER BY title ASC";
    console.log("Executing query:", query);

    const results = await executeQuery(query);

    console.log("Raw query results:", JSON.stringify(results, null, 2));

    let objectives = [];

    if (Array.isArray(results)) {
      objectives = results;
    } else if (results && Array.isArray(results[0])) {
      objectives = results[0];
    } else if (results && results.results) {
      objectives = results.results;
    } else if (results) {
      objectives = [results];
    }

    console.log("Processed objectives:", JSON.stringify(objectives, null, 2));

    return res.json({
      status: "success",
      data: objectives,
      requestId,
    });
  } catch (error) {
    console.error("Error in getObjectives:", error);
    return handleError(res, error, requestId);
  }
};

export const deleteUser = async (req, res) => {
  const requestId = Date.now();
  const { id } = req.params;

  try {
    const [users] = await executeQuery("SELECT id FROM users WHERE id = ?", [
      id,
    ]);
    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
        requestId,
      });
    }

    await executeTransaction(async (connection) => {
      const [userIntervals] = await connection.execute(
        "SELECT interval_id FROM user_intervals WHERE user_id = ?",
        [id]
      );

      await connection.execute(
        "DELETE FROM user_objectives WHERE user_id = ?",
        [id]
      );

      if (userIntervals && userIntervals.length > 0) {
        const intervalIds = userIntervals.map((i) => i.interval_id);
        if (intervalIds.length > 0) {
          await connection.query(
            "DELETE FROM user_intervals WHERE user_id = ?",
            [id]
          );
          await connection.query("DELETE FROM intervals WHERE id IN (?)", [
            intervalIds,
          ]);
        }
      }

      await connection.execute("DELETE FROM users WHERE id = ?", [id]);
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return handleError(res, error, requestId);
  }
};

export const getIntervalTypes = async (req, res) => {
  const requestId = Date.now();

  try {
    const query = "SELECT * FROM interval_types ORDER BY duration_minutes ASC";
    console.log("Executing interval types query:", query);

    const results = await executeQuery(query);

    console.log(
      "Raw interval types results:",
      JSON.stringify(results, null, 2)
    );

    let intervalTypes = [];

    if (Array.isArray(results)) {
      intervalTypes = results;
    } else if (results && Array.isArray(results[0])) {
      intervalTypes = results[0];
    } else if (results && results.results) {
      intervalTypes = results.results;
    } else if (results) {
      intervalTypes = [results];
    }

    console.log(
      "Processed interval types:",
      JSON.stringify(intervalTypes, null, 2)
    );

    return res.json({
      status: "success",
      data: intervalTypes,
      requestId,
    });
  } catch (error) {
    console.error("Error in getIntervalTypes:", error);
    return handleError(res, error, requestId);
  }
};
