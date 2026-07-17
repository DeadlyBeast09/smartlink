import express from "express";

import {
  renderSignup,
  renderLogin,
  signup,
  login,
  logout,
} from "../controllers/authController.js";

import {redirectIfAuthenticated} from '../middlewares/authMiddleware.js'
const router = express.Router();

router.get("/signup",redirectIfAuthenticated, renderSignup);
router.post("/signup", signup);

router.get("/login",redirectIfAuthenticated, renderLogin);
router.post("/login", login);

router.get("/logout", logout);

export { router };