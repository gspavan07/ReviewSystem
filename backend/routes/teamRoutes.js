const express = require("express");
const router = express.Router();
const {
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  unlockTeamScoring,
  lockTeamScoring
} = require("../controllers/teamController");

router.get("/", getAllTeams);
router.post("/", createTeam);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);
router.put("/:id/unlock-scoring", unlockTeamScoring);
router.put("/:id/lock-scoring", lockTeamScoring);

module.exports = router;