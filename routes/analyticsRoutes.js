import express from "express";

import {
  authenticate,
} from "../middlewares/authMiddleware.js";

import {
  renderAnalytics,
} from "../controllers/analyticsController.js";

const router =
  express.Router();

router.get(
  "/analytics/:shortId",
  authenticate,
  renderAnalytics
);

export { router };