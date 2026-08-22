const {
  getProfileByUserId,
  updateProfile,
} = require("../repositories/profileRepository");

function getAuthenticatedUserId(req) {
  const userId = req.user?.sub;

  if (!userId) {
    const error = new Error(
      "Authentication required",
    );

    error.statusCode = 401;

    throw error;
  }

  return userId;
}

async function getProfile(
  req,
  res,
  next,
) {
  try {
    const userId =
      getAuthenticatedUserId(req);

    const profile =
      await getProfileByUserId(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return next(error);
  }
}

async function patchProfile(
  req,
  res,
  next,
) {
  try {
    const userId =
      getAuthenticatedUserId(req);

    const name =
      typeof req.body.name === "string"
        ? req.body.name.trim()
        : "";

    const bio =
      typeof req.body.bio === "string"
        ? req.body.bio.trim()
        : "";

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Name cannot exceed 100 characters",
      });
    }

    if (bio.length > 500) {
      return res.status(400).json({
        success: false,
        message:
          "Bio cannot exceed 500 characters",
      });
    }

    const profile =
      await updateProfile(userId, {
        name,
        bio,
      });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProfile,
  patchProfile,
};