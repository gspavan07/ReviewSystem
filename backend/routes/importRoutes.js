const express = require("express");
const router = express.Router();
const { uploadExcel } = require("../middleware/upload");
const { importExcel, getImportProgress } = require("../controllers/importController");

router.post("/import-excel", uploadExcel.single("excelFile"), importExcel);
router.get("/import-progress/:sessionId", getImportProgress);

module.exports = router;