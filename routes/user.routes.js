import { Router } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import * as userController from "../controllers/user.controller.js";

const router = Router();

// Security middleware
router.use(helmet());
router.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.use(apiLimiter);

router.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${
      req.ip
    }`
  );
  next();
});

const validateId = [
  param("id").isInt({ min: 1 }).withMessage("Invalid user ID").toInt(),
];

const validatePagination = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a positive integer")
    .toInt(),
];

const validateUserInput = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("objectives")
    .optional()
    .isArray()
    .withMessage("Objectives must be an array")
    .custom((objectives) => {
      if (!objectives.every(Number.isInteger)) {
        throw new Error("All objectives must be valid IDs");
      }
      return true;
    }),

  body("intervals")
    .optional()
    .isArray()
    .withMessage("Intervals must be an array")
    .custom((intervals) => {
      if (!Array.isArray(intervals)) return false;
      return intervals.every((id) => Number.isInteger(id) && id > 0);
    })
    .withMessage("Intervals must be an array of valid interval type IDs"),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

router.get(
  "/",
  validatePagination,
  handleValidationErrors,
  userController.getAllUsers
);

router.get(
  "/:id",
  validateId,
  handleValidationErrors,
  userController.getUserById
);

router.post(
  "/",
  validateUserInput,
  handleValidationErrors,
  userController.createUser
);

router.put(
  "/:id",
  [...validateId, ...validateUserInput],
  handleValidationErrors,
  userController.updateUser
);

router.delete(
  "/:id",
  validateId,
  handleValidationErrors,
  userController.deleteUser
);

router.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl,
  });
});

router.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

export default router;
