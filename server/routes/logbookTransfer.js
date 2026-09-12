const express = require("express");
const { exportLogbook, importLogbook } = require("../controllers/logbookTransferController");

const router = express.Router();
router.get("/export", exportLogbook);
router.post("/import", importLogbook);
module.exports = router;
