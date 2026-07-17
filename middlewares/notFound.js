import {AppError} from "../utils/AppError.js";

/**
 * Catches any request that didn't match a route above it in app.js.
 * Converts it into the same AppError shape the rest of the app uses,
 * so it flows through the same errorHandler instead of Express's
 * default ugly HTML stack-trace page.
 */
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export {notFound};
