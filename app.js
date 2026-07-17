import express from "express";
import path from "path";

import {config} from "./config/index.js";
import connectDB from "./config/db.js";

import {router as urlRoutes} from "./routes/urlRoutes.js";

import {errorHandler} from "./middlewares/errorHandler.js";
import {notFound} from "./middlewares/notFound.js";

import { fileURLToPath } from "url";

import cookieParser from "cookie-parser";
import { router as authRoutes } from "./routes/authRoutes.js";
import {router as analyticsRoutes} from "./routes/analyticsRoutes.js";

import {  attachUser} from "./middlewares/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---- View engine ----
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---- Core middleware ----
app.use(express.json()); // parse application/json bodies
app.use(express.urlencoded({ extended: true })); // parse HTML form submissions
app.use(cookieParser());
app.use(attachUser);
app.use(express.static(path.join(__dirname, "public"))); // serve /public as static assets

// ---- Routes ----
// All current routes (including the catch-all /:shortId redirect) live in
// urlRoutes. From Phase 2 onward, auth/dashboard routers get mounted here
// BEFORE urlRoutes, so the catch-all never shadows them.
app.use("/", authRoutes);
app.use("/", analyticsRoutes);
app.use("/", urlRoutes);

// ---- 404 + centralized error handling ----
// Order matters: notFound only runs if nothing above matched, and
// errorHandler must be registered LAST — Express identifies it as an
// error handler by its 4-argument signature.
app.use(notFound);
app.use(errorHandler);

// ---- Boot sequence ----
const start = async () => {
  await connectDB();

  app.listen(config.port, () => {
    console.log(
      `[SERVER] Listening on ${config.baseUrl} (${config.nodeEnv})`
    );
  });
};

// Only auto-start when run directly (`node app.js`), not when imported
// by a test file — tests import `app` and drive it with supertest
// against an in-memory/test database instead.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}

export default app;