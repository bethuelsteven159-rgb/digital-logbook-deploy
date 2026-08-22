import express from "express";

import {
  getProjectDetails,
  createEntry,
} from "../controllers/projectDetails.controller.js";

import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

/*
  Authentication belongs to the authentication section.
  We only consume their middleware here.
*/

router.use(requireAuth);

router.get("/:projectId", getProjectDetails);

router.post("/:projectId/entries", createEntry);

export default router;