import dotenv from "dotenv";

dotenv.config();
import "dotenv/config";

console.log("MONGO_URI =", process.env.MONGO_URI);
/**
 * Centralizing env access means:
 * 1. Every other file imports config, never process.env directly.
 * 2. Missing required vars fail loudly at boot, not deep inside a request.
 * 3. Renaming an env var only touches one file.
 */
const required = ["MONGO_URI"];

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

export  {config};
