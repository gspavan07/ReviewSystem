const Team = require("../models/Team");
const User = require("../models/User");
const Review = require("../models/Review");
const { sendLoginDetails } = require('../utils/emailService');

const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTeam = async (req, res) => {
  try {
    const team = new Team(req.body);
    await team.save();
    
    // Auto-create student user for this batch
    const batchName = team.name.toLowerCase().replace(/\s+/g, '_');
    const username = batchName;
    const password = `std@${batchName}`;
    
    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      const studentUser = new User({
        username,
        password,
        role: 'student',
        assignedBatch: team.name,
        assignedSections: []
      });
      await studentUser.save();
      console.log(`✅ Created student user: ${username} / ${password}`);
      
      try {
        const emailResults = await sendLoginDetails(team.name, team.members, username, password);
        console.log(`📧 Email notification results:`, emailResults);
      } catch (emailError) {
        console.error(`❌ Email notification failed:`, emailError.message);
      }
    }
    
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { reviewerId, _absentMembers, name, members, projectTitle, guide, isBasicUpdate, ...updateData } = req.body;
    
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    
    // Handle basic team information updates (name, members, etc.)
    if (isBasicUpdate || name || members || projectTitle !== undefined || guide !== undefined) {
      if (name) team.name = name;
      if (members) team.members = members;
      if (projectTitle !== undefined) team.projectTitle = projectTitle;
      if (guide !== undefined) team.guide = guide;
      
      await team.save();
      return res.json(team);
    }
    
    // Handle review data updates
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    
    if (!team.reviewData) {
      team.reviewData = {};
    }
    if (!team.reviewData[activeReview._id]) {
      team.reviewData[activeReview._id] = {};
    }
    
    const isReviewLocked = team.reviewData[activeReview._id]._scoringLocked;
    if (isReviewLocked && (!req.body.isHead)) {
      return res.status(403).json({ error: "Scoring is locked for this review. Contact head to unlock." });
    }
    
    if (_absentMembers) {
      team.reviewData[activeReview._id]._absentMembers = _absentMembers;
    }
    
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'object' && updateData[key] !== null) {
        team.reviewData[activeReview._id][key] = {
          ...team.reviewData[activeReview._id][key],
          ...updateData[key]
        };
      } else {
        team.reviewData[activeReview._id][key] = updateData[key];
      }
    });
    
    // Store reviewer information
    if (reviewerId) {
      team.reviewData[activeReview._id]._submittedBy = reviewerId;
      team.reviewData[activeReview._id]._submittedAt = new Date();
    }
    
    if (!req.body.isHead && !isReviewLocked) {
      team.reviewData[activeReview._id]._scoringLocked = true;
    }
    
    team.markModified('reviewData');
    await team.save();
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (team) {
      const batchName = team.name.toLowerCase().replace(/\s+/g, '_');
      await User.findOneAndDelete({ username: batchName, role: 'student' });
    }
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: "Team deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const unlockTeamScoring = async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    
    if (!team.reviewData) {
      team.reviewData = {};
    }
    if (!team.reviewData[activeReview._id]) {
      team.reviewData[activeReview._id] = {};
    }
    
    team.reviewData[activeReview._id]._scoringLocked = false;
    team.markModified('reviewData');
    await team.save();
    
    res.json({ message: "Team scoring unlocked for current review", team });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const lockTeamScoring = async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    
    if (!team.reviewData) {
      team.reviewData = {};
    }
    if (!team.reviewData[activeReview._id]) {
      team.reviewData[activeReview._id] = {};
    }
    
    team.reviewData[activeReview._id]._scoringLocked = true;
    team.markModified('reviewData');
    await team.save();
    
    res.json({ message: "Team scoring locked for current review", team });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  unlockTeamScoring,
  lockTeamScoring
};