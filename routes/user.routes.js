import { Router } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as userController from '../controllers/user.controller.js';
import { body, param, validationResult } from 'express-validator';
import { validateQueryParams, validateUserInput, validateUserUpdate } from '../controllers/user.controller.js';

const router = Router();

router.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

router.use(apiLimiter);

router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID')
    .toInt()
    .customSanitizer(val => parseInt(val, 10)),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

router.get('/', 
  validateQueryParams,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }
    next();
  },
  userController.getAllUsers
);
router.get('/:id', validateId, handleValidationErrors, userController.getUserById);
// Create a new user
router.post('/', 
  userController.validateUserInput,
  userController.createUser
);

// Update all fields of a user
router.put('/:id', 
  validateId, 
  userController.validateUserInput, 
  userController.updateUser
);

// Partially update a user
router.patch('/:id', 
  validateId, 
  userController.validateUserUpdate,
  userController.updateUser
);
router.delete('/:id', 
  validateId, 
  handleValidationErrors, 
  userController.deleteUser
);

router.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

router.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

router.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

export default router;
