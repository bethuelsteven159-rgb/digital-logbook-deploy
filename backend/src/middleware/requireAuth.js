export function requireAuth(req, res, next) {
  if (process.env.DEV_BYPASS_AUTH === "true") {
    req.user = {
      id: process.env.DEV_USER_ID || "dev-user-1",
      email:
        process.env.DEV_USER_EMAIL || "bethuel.test@wits.ac.za",
    };

    return next();
  }

  return res.status(401).json({
    success: false,
    message:
      "Authentication is not available yet. Enable DEV_BYPASS_AUTH for local testing.",
  });
}

export default requireAuth;