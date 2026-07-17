import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;
    next();
  } catch (err) {
    return res.redirect("/login");
  }
};

const redirectIfAuthenticated = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return next();
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);

    return res.redirect("/");
  } catch (err) {
    return next();
  }
};

const attachUser = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    res.locals.user = null;
    return next();
  }

  try {
    res.locals.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    res.locals.user = null;
  }

  next();
};

export {
  authenticate,
  redirectIfAuthenticated,
  attachUser
};