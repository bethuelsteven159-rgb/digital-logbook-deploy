const jwt = require("jsonwebtoken");

module.exports = function requireAuth(req, res, next) {
  const authorization =
    req.headers.authorization || "";

  const token = authorization.startsWith(
    "Bearer ",
  )
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication token",
    });
  }
};