const express = require("express");
const router = express.Router();
const {
  getAllColumns,
  createColumn,
  updateColumn,
  deleteColumn
} = require("../controllers/columnController");

router.get("/", getAllColumns);
router.post("/", createColumn);
router.put("/:name", updateColumn);
router.delete("/:name", deleteColumn);

module.exports = router;