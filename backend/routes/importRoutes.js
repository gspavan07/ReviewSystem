const express = require("express");
const router = express.Router();
const { uploadExcel } = require("../middleware/upload");
const { importExcel } = require("../controllers/importController");

router.post("/import-excel", uploadExcel.single("excelFile"), importExcel);

module.exports = router;