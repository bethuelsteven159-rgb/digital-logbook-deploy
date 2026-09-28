const {
  exportLogbookService,
  importLogbookService,
} = require("../services/logbookTransferService");

function requireUserId(req) {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }
  return userId;
}

async function exportLogbook(req, res, next) {
  try {
    const userId = requireUserId(req);
    const data = await exportLogbookService({ userId });
    return res.status(200).json({ success: true, data });
  } catch (error) { return next(error); }
}

async function importLogbook(req, res, next) {
  try {
    const userId = requireUserId(req);
    const data = await importLogbookService({ userId, payload: req.body });
    return res.status(201).json({ success: true, data });
  } catch (error) { return next(error); }
}

module.exports = { exportLogbook, importLogbook };
