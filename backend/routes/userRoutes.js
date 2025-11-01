const express = require("express");
const router = express.Router();
const {
  login,
  getAllUsers,
  getUserByUsername,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  initializeDefaultUser
} = require("../controllers/userController");

router.get("/init", initializeDefaultUser);
router.get("/", getAllUsers);
router.get("/:username", getUserByUsername);
router.post("/", createUser);
router.put("/:id", updateUser);
router.put("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);

module.exports = router;