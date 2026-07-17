import express from "express";
import {
  renderHome,
  createShortUrl,
  redirectToOriginalUrl,
  renderDashboard,
  renderEditUrl,
  editUrl,
  deleteUrl
} from "../controllers/urlController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();


/**
 * Route file responsibility: map HTTP verb + path -> controller function.
 * Nothing else. No logic here — if a route needs validation/auth, that's
 * a middleware plugged in between path and controller (see Phase 2/7).
 */

router.get("/",authenticate, renderHome);

router.post(
  "/api/shorten",
  authenticate,
  createShortUrl
);

// IMPORTANT: this catch-all redirect route must be registered LAST in
// app.js, after all other specific routes (e.g. /api/*, /dashboard).
// Express matches routes in registration order, so if this were
// registered first, "/dashboard" would be misinterpreted as a shortId
// lookup and never reach the dashboard route. This ordering rule shows
// up again when we add /signup, /login, /dashboard in later phases.
/**
 * Phase 3:
 * User dashboard showing URLs owned by the authenticated user.
 */
router.get(
  "/dashboard",
  authenticate,
  renderDashboard
);

router.get(
  "/urls/:shortId/edit",
  authenticate,
  renderEditUrl
);

router.post(
  "/urls/:shortId/edit",
  authenticate,
  editUrl
);

router.post(
  "/urls/:shortId/delete",
  authenticate,
  deleteUrl
);

router.get("/:shortId", redirectToOriginalUrl);



export {router};