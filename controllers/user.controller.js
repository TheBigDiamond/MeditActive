import User from "../models/user.model.js";
import {
  body,
  param,
  query,
  validationResult,
  matchedData,
} from "express-validator";

export const validateQueryParams = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be a number between 1 and 100")
    .toInt(),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a positive number or zero")
    .toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

const detectSQLInjection = (value) => {
  if (typeof value !== "string") return false;
  const sqlInjectionPatterns = [];
  return sqlInjectionPatterns.some((pattern) => pattern.test(value));
};

const baseUserValidationRules = [
  body("firstName")
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("First name contains invalid characters"),

  body("lastName")
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Last name contains invalid characters"),

  body("email")
    .optional()
    .trim()
    .escape()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("obiettivo")
    .optional()
    .trim()
    .escape()
    .toLowerCase()
    .custom((value, { req }) => {
      const validGoals = [
        "perdita di peso",
        "weight loss",
        "mantenimento",
        "maintenance",
        "massa muscolare",
        "muscle gain",
      ];

      if (!validGoals.includes(value)) {
        throw new Error(
          'Invalid goal type. Valid values are: "Perdita di Peso" or "Weight Loss", "Mantenimento" or "Maintenance", "Massa Muscolare" or "Muscle Gain"'
        );
      }

      const goalMap = {
        "weight loss": "Perdita di Peso",
        "perdita di peso": "Perdita di Peso",
        maintenance: "Mantenimento",
        mantenimento: "Mantenimento",
        "muscle gain": "Massa Muscolare",
        "massa muscolare": "Massa Muscolare",
      };

      req.body.obiettivo = goalMap[value];
      return true;
    }),

  body("dataInizio")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid start date (YYYY-MM-DD)"),

  body("dataFine")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid end date (YYYY-MM-DD)"),

  (req, res, next) => {
    console.log("Request body validation:", req.method, req.path, req.body);
    next();
  },
];

export const validateUserInput = [
  body("firstName")
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage("First name is required"),

  body("lastName")
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage("Last name is required"),

  body("email")
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage("Email is required"),

  ...baseUserValidationRules,

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

export const validateUserUpdate = [
  ...baseUserValidationRules,
  (req, res, next) => {
    const updates = Object.keys(req.body);
    if (updates.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
        details: "Please provide at least one field to update",
      });
    }
    next();
  },

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

export const getAllUsers = async (req, res) => {
  const requestId = Date.now();

  console.log(`\n=== [${requestId}] GET /api/users ===`);
  console.log(`[${requestId}] Query parameters:`, req.query);

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    console.log(`[${requestId}] Fetching users with pagination:`, {
      limit,
      offset,
    });

    try {
      console.log(`[${requestId}] Calling User.findAll()...`);
      const result = await User.findAll({ limit, offset });

      console.log(
        `[${requestId}] ✅ Successfully retrieved ${result.data.length} users from database`
      );

      return res.status(200).json({
        status: "success",
        data: result.data,
        pagination: result.pagination,
        requestId,
      });
    } catch (dbError) {
      const errorDetails = {
        requestId,
        timestamp: new Date().toISOString(),
        message: dbError.message,
        code: dbError.code,
        errno: dbError.errno,
        sqlState: dbError.sqlState,
        sqlMessage: dbError.sqlMessage,
        sql: dbError.sql,
        stack:
          process.env.NODE_ENV === "development" ? dbError.stack : undefined,
      };

      console.error(
        `[${requestId}] ❌ Database error in User.findAll():`,
        errorDetails
      );

      let statusCode = 500;
      let errorMessage = "Database operation failed";

      switch (dbError.code) {
        case "ER_ACCESS_DENIED_ERROR":
          statusCode = 503; // Service Unavailable
          errorMessage = "Database access denied";
          break;
        case "ER_DBACCESS_DENIED_ERROR":
          statusCode = 403; // Forbidden
          errorMessage = "Database access denied";
          break;
        case "ER_NO_SUCH_TABLE":
          statusCode = 500; // Internal Server Error
          errorMessage = "Database table does not exist";
          break;
        case "ER_BAD_DB_ERROR":
          statusCode = 500;
          errorMessage = "Database does not exist";
          break;
        case "ER_PARSE_ERROR":
        case "ER_BAD_FIELD_ERROR":
          statusCode = 400; // Bad Request
          errorMessage = "Invalid query parameters";
          break;
      }

      const response = {
        status: "error",
        message: errorMessage,
      };

      if (process.env.NODE_ENV === "development") {
        response.error = {
          message: dbError.message,
          ...(dbError.code && { code: dbError.code }),
          ...(dbError.sql && { sql: dbError.sql }),
          ...(dbError.sqlMessage && { sqlMessage: dbError.sqlMessage }),
          ...(dbError.stack && { stack: dbError.stack }),
        };
      }

      return res.status(statusCode).json(response);
    }
  } catch (error) {
    console.error("❌ Unexpected error in getAllUsers:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      ...(error.sql && { sql: error.sql }),
      ...(error.sqlMessage && { sqlMessage: error.sqlMessage }),
      ...(error.sqlState && { sqlState: error.sqlState }),
    });

    const response = {
      status: "error",
      message: "An unexpected error occurred while processing your request",
    };

    if (process.env.NODE_ENV === "development") {
      response.error = {
        message: error.message,
        ...(error.code && { code: error.code }),
        ...(error.stack && { stack: error.stack }),
      };
    }

    return res.status(500).json(response);
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id, 10)) || detectSQLInjection(String(id))) {
      return res.status(400).json({
        status: "error",
        message: "Invalid request",
        details: "Invalid user ID format",
      });
    }

    const userId = parseInt(id, 10);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        details: `No user found with ID: ${id}`,
      });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error getting user:", error);

    const statusCode =
      error.code === "ER_PARSE_ERROR" ||
      error.code === "ER_BAD_FIELD_ERROR" ||
      error.sqlMessage
        ? 400
        : 500;

    const response = {
      status: "error",
      message: statusCode === 400 ? "Invalid request" : "Internal server error",
    };

    if (process.env.NODE_ENV === "development") {
      response.details = error.message;
      if (error.sql) response.sql = error.sql;
    }

    res.status(statusCode).json(response);
  }
};

export const createUser = async (req, res) => {
  const requestId = Date.now();
  console.log(`\n=== [${requestId}] CREATE USER REQUEST ===`);

  try {
    console.log(`[${requestId}] Request headers:`, req.headers);
    console.log(`[${requestId}] Request body:`, req.body);

    if (!req.body || Object.keys(req.body).length === 0) {
      console.log(`[${requestId}] ❌ Error: Request body is empty`);
      return res.status(400).json({
        status: "error",
        message: "Request body is empty",
        requestId,
      });
    }

    const { firstName, lastName, email, obiettivo, dataInizio, dataFine } =
      req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        message: "First name, last name, and email are required",
        received: { firstName, lastName, email },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(422).json({
        message: "Validation failed",
        details: "Invalid email format",
      });
    }

    if (dataInizio && isNaN(Date.parse(dataInizio))) {
      return res.status(422).json({
        message: "Validation failed",
        details: "Invalid start date format. Use ISO format (YYYY-MM-DD)",
      });
    }

    if (dataFine && isNaN(Date.parse(dataFine))) {
      return res.status(422).json({
        message: "Validation failed",
        details: "Invalid end date format. Use ISO format (YYYY-MM-DD)",
      });
    }

    console.log(`[${requestId}] Creating user with data:`, {
      firstName,
      lastName,
      email,
      obiettivo,
      dataInizio,
      dataFine,
    });

    try {
      const user = await User.create({
        firstName,
        lastName,
        email,
        obiettivo,
        dataInizio,
        dataFine,
      });

      console.log(`[${requestId}] ✅ User created successfully:`, user);

      const response = {
        status: "success",
        data: user,
        requestId,
      };

      console.log(`[${requestId}] Sending response:`, response);

      res.status(201);
      res.setHeader("Content-Type", "application/json");
      return res.send(JSON.stringify(response, null, 2));
    } catch (dbError) {
      console.error(`[${requestId}] ❌ Database error:`, {
        message: dbError.message,
        code: dbError.code,
        sql: dbError.sql,
        sqlMessage: dbError.sqlMessage,
        stack: dbError.stack,
      });

      throw dbError;
    }
  } catch (error) {
    const errorId = `err_${Date.now()}`;
    const errorDetails = {
      errorId,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        headers: {
          "content-type": req.get("content-type"),
          "content-length": req.get("content-length"),
          "user-agent": req.get("user-agent"),
        },
      },
    };

    console.error(
      `[${requestId}] ❌ Error in createUser (${errorId}):`,
      errorDetails
    );

    if (error.code) {
      switch (error.code) {
        case "ER_DUP_ENTRY":
          return res.status(409).json({
            status: "error",
            message: "Email already exists",
            errorId,
            requestId,
          });

        case "ER_NO_SUCH_TABLE":
          return res.status(500).json({
            status: "error",
            message: "Database table does not exist",
            details:
              "The users table is missing. Please run the database migrations.",
            errorId,
            requestId,
          });

        case "ER_ACCESS_DENIED_ERROR":
          return res.status(500).json({
            status: "error",
            message: "Database access denied",
            details: "Please check your database credentials.",
            errorId,
            requestId,
          });

        case "ER_BAD_FIELD_ERROR":
          return res.status(400).json({
            status: "error",
            message: "Invalid field in database operation",
            details: error.sqlMessage,
            errorId,
            requestId,
          });
      }
    }

    const response = {
      status: "error",
      message: "An unexpected error occurred while creating the user",
      errorId,
      requestId,
    };

    if (process.env.NODE_ENV === "development") {
      response.details = {
        message: error.message,
        ...(error.code && { code: error.code }),
        ...(error.sql && { sql: error.sql }),
        ...(error.sqlMessage && { sqlMessage: error.sqlMessage }),
      };
    }

    return res.status(500).json(response);
  }
};

export const updateUser = async (req, res) => {
  const requestId = Date.now();
  console.log(`\n=== [${requestId}] UPDATE USER REQUEST ===`);
  console.log(`[${requestId}] Request params:`, req.params);
  console.log(`[${requestId}] Request body:`, req.body);

  try {
    const { id } = req.params;

    const updates = Object.keys(req.body);
    if (updates.length === 0) {
      const error = new Error("No fields to update");
      error.code = "NO_FIELDS_TO_UPDATE";
      throw error;
    }

    const { firstName, lastName, email, obiettivo, dataInizio, dataFine } =
      req.body;

    if (!id || isNaN(parseInt(id, 10))) {
      const error = new Error("Invalid user ID format");
      error.code = "INVALID_ID_FORMAT";
      throw error;
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      const error = new Error("No update data provided");
      error.code = "NO_UPDATE_DATA";
      throw error;
    }

    console.log(`[${requestId}] Validating user exists...`);
    const existingUser = await User.findById(id);
    if (!existingUser) {
      const error = new Error(`User with ID ${id} not found`);
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const error = new Error("Invalid email format");
        error.code = "INVALID_EMAIL";
        throw error;
      }
    }

    if (
      dataInizio !== undefined &&
      dataInizio &&
      isNaN(Date.parse(dataInizio))
    ) {
      const error = new Error(
        "Invalid start date format. Use ISO format (YYYY-MM-DD)"
      );
      error.code = "INVALID_START_DATE";
      throw error;
    }

    if (dataFine !== undefined && dataFine && isNaN(Date.parse(dataFine))) {
      const error = new Error(
        "Invalid end date format. Use ISO format (YYYY-MM-DD)"
      );
      error.code = "INVALID_END_DATE";
      throw error;
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (obiettivo !== undefined) updateData.obiettivo = obiettivo;
    if (dataInizio !== undefined) updateData.dataInizio = dataInizio;
    if (dataFine !== undefined) updateData.dataFine = dataFine;

    console.log(`[${requestId}] Update data prepared:`, updateData);

    console.log(`[${requestId}] Calling User.update()...`);
    const user = await User.update(id, updateData);

    if (!user) {
      const error = new Error("User update did not return any data");
      error.code = "UPDATE_RETURNED_NULL";
      throw error;
    }

    console.log(`[${requestId}] ✅ User updated successfully:`, user);

    return res.status(200).json({
      status: "success",
      data: user,
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error in updateUser:`, {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      ...(error.sql && { sql: error.sql }),
      ...(error.sqlMessage && { sqlMessage: error.sqlMessage }),
    });

    switch (error.code) {
      case "ER_DUP_ENTRY":
      case "DUPLICATE_EMAIL":
        return res.status(409).json({
          status: "error",
          message: "Email already exists",
          details: "The provided email is already in use by another user",
          requestId,
        });

      case "USER_NOT_FOUND":
        return res.status(404).json({
          status: "error",
          message: "User not found",
          details: `No user found with ID: ${id}`,
          requestId,
        });

      case "INVALID_EMAIL":
        return res.status(422).json({
          status: "error",
          message: "Validation failed",
          details: "The provided email is not in a valid format",
          requestId,
        });

      case "INVALID_START_DATE":
      case "INVALID_END_DATE":
      case "NO_FIELDS_TO_UPDATE":
      case "NO_UPDATE_DATA":
      case "INVALID_ID_FORMAT":
      case "UPDATE_RETURNED_NULL":
        return res.status(422).json({
          status: "error",
          message: "Validation failed",
          details: error.message,
          requestId,
        });

      default:
        const response = {
          status: "error",
          message: "Failed to update user",
          details: "An unexpected error occurred while updating the user",
          requestId,
        };

        if (process.env.NODE_ENV === "development") {
          response.error = {
            message: error.message,
            ...(error.code && { code: error.code }),
            ...(error.stack && { stack: error.stack }),
          };
        }

        return res.status(500).json(response);
    }
  }
};

export const deleteUser = async (req, res) => {
  const requestId = Date.now();
  console.log(`\n=== [${requestId}] DELETE USER REQUEST ===`);
  console.log(`[${requestId}] Request params:`, req.params);

  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id, 10))) {
      const error = new Error("Invalid user ID format");
      error.code = "INVALID_ID_FORMAT";
      throw error;
    }

    console.log(`[${requestId}] Validating user exists...`);
    const existingUser = await User.findById(id);
    if (!existingUser) {
      const error = new Error(`User with ID ${id} not found`);
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    console.log(`[${requestId}] Deleting user...`);
    const deletedUser = await User.delete(id);

    if (!deletedUser) {
      const error = new Error("Failed to delete user");
      error.code = "DELETE_FAILED";
      throw error;
    }

    console.log(`[${requestId}] ✅ User deleted successfully`);

    return res.status(204).end();
  } catch (error) {
    console.error(`[${requestId}] ❌ Error in deleteUser:`, {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      ...(error.sql && { sql: error.sql }),
      ...(error.sqlMessage && { sqlMessage: error.sqlMessage }),
    });

    switch (error.code) {
      case "USER_NOT_FOUND":
        return res.status(404).json({
          status: "error",
          message: "User not found",
          details: `No user found with ID: ${req.params.id}`,
          requestId,
        });

      case "INVALID_ID_FORMAT":
        return res.status(422).json({
          status: "error",
          message: "Validation failed",
          details: "The provided user ID is not in a valid format",
          requestId,
        });

      case "DELETE_FAILED":
        return res.status(500).json({
          status: "error",
          message: "Failed to delete user",
          details: "An error occurred while deleting the user",
          requestId,
        });

      default:
        const response = {
          status: "error",
          message: "Failed to delete user",
          details: "An unexpected error occurred while deleting the user",
          requestId,
        };

        if (process.env.NODE_ENV === "development") {
          response.error = {
            message: error.message,
            ...(error.code && { code: error.code }),
            ...(error.stack && { stack: error.stack }),
          };
        }

        return res.status(500).json(response);
    }
  }
};
