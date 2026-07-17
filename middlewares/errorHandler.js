/**
 * Centralized error-handling middleware.
 *
 * Express recognizes this as an error handler purely by arity — a
 * function with exactly 4 params (err, req, res, next) is treated
 * specially and only called when next(err) is invoked (or a sync throw
 * occurs inside a route handler in Express 5 / wrapped handlers).
 *
 * Why centralize this instead of try/catch + res.status() in every
 * controller:
 * - One place to decide response shape, logging, and what's safe to
 *   leak to the client (never raw stack traces in production).
 * - Adding a new error type (e.g. ValidationError) means editing one
 *   file, not every controller.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Something went wrong";

  if (!err.isOperational) {
    // Unexpected (programmer) errors get logged with full detail server-side
    // even though the client never sees the internals.
    console.error("[UNHANDLED ERROR]", err);
  }

  if (req.accepts("html") && !req.originalUrl.startsWith("/api")) {
    return res.status(statusCode).render("error", { statusCode, message });
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

export {errorHandler};
