const jwt = require("jsonwebtoken");

const DEV_USER = {
  id: process.env.DEV_USER_ID || "dev-user-1",
  email: process.env.DEV_USER_EMAIL || "dev@example.dev",
};

module.exports = function devAuth(req, res, next) {
  const bypassEnabled =
    process.env.DEV_BYPASS_AUTH === "true" &&
    process.env.NODE_ENV !== "production";

  if (bypassEnabled) {
    req.user = { ...DEV_USER };
    return next();
  }

  // Fall back to real JWT auth even in server_mine.js,
  // in case DEV_BYPASS_AUTH is off.
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);

    if (!req.user.id && req.user.sub) {
      req.user.id = req.user.sub;
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};
