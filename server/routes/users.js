const express = require("express");

const {
  getProfile,
  patchProfile,
} = require("../controllers/profileController");

const router = express.Router();

router.get(
  "/me/profile",
  getProfile,
);

router.patch(
  "/me/profile",
  patchProfile,
);

module.exports = router;