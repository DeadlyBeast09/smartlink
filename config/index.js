import "dotenv/config";

/**
 * Centralized environment configuration.
 *
 * Benefits:
 * 1. All files import config instead of using process.env directly.
 * 2. Missing required variables fail at startup.
 * 3. Environment variable names are managed in one place.
 */

const required = ["MONGO_URI", "JWT_SECRET"];

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[CONFIG] Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  baseUrl:
    process.env.BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`,

  mongoUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  cookieName: process.env.COOKIE_NAME || "token",
};

export { config };