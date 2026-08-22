import { createEntrySchema } from "../validation/entry.validation.js";

import {
  getProjectDetailsService,
  createEntryService,
} from "../services/projectDetails.service.js";

export async function getProjectDetails(req, res, next) {
  try {
    const { projectId } = req.params;

    const userId = req.user.id;

    const data = await getProjectDetailsService({
      projectId,
      userId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function createEntry(req, res, next) {
  try {
    const parsed = createEntrySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry data",
        errors: parsed.error.flatten(),
      });
    }

    const { projectId } = req.params;

    const userId = req.user.id;

    const entry = await createEntryService({
      projectId,
      userId,
      data: parsed.data,
    });

    return res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
}