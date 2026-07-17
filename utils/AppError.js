/**
 * AppError lets controllers/services throw errors that carry an HTTP
 * status code, instead of throwing plain Error objects and guessing the
 * status code later in a catch block. This keeps error origin and error
 * response in sync, and makes the central error-handling middleware
 * (middlewares/errorHandler.js) dumb and reusable.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes "expected" errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

export { AppError };
