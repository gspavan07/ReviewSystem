const express = require("express");
const router = express.Router();
const { sendLoginDetailsToAllTeams, sendLoginDetailsToSelectedBatch } = require("../controllers/emailController");

router.post("/send-login-details", sendLoginDetailsToAllTeams);
router.post("/send-login-details/:teamId", sendLoginDetailsToSelectedBatch);

module.exports = router;