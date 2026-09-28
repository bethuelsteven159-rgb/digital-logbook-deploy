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

    // Normalize token shape: some tokens use "id", others use "sub"
    // (Google-auth session tokens sign with "sub"). This lets both
    // conventions work without every route needing to agree.
    if (!req.user.id && req.user.sub) {
      req.user.id = req.user.sub;
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication token",
    });
  }
};
