import {
  signupUser,
  loginUser,
} from "../services/authService.js";

const renderSignup = (req, res) => {
  res.render("signup");
};

const renderLogin = (req, res) => {
  res.render("login");
};

const signup = async (req, res, next) => {
  try {
    await signupUser(req.body);

    return res.redirect("/login");
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { token } = await loginUser(req.body);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
    });

    return res.redirect("/");
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.clearCookie("token");

  return res.redirect("/login");
};

export {
  renderSignup,
  renderLogin,
  signup,
  login,
  logout,
};