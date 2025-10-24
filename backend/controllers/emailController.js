const Team = require("../models/Team");
const { sendLoginDetails } = require('../utils/emailService');

const sendLoginDetailsToAllTeams = async (req, res) => {
  try {
    const teams = await Team.find();
    const results = [];

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const batchName = team.name.toLowerCase().replace(/\s+/g, '_');
      const username = batchName;
      const password = `std@${batchName}`;

      try {
        const emailResults = await sendLoginDetails(team.name, team.members, username, password);
        results.push({
          teamName: team.name,
          emailResults,
          success: true
        });
      } catch (error) {
        results.push({
          teamName: team.name,
          error: error.message,
          success: false
        });
      }

      // Add 2 second delay between teams to prevent rate limiting
      if (i < teams.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    res.json({
      message: `Email sending completed for ${teams.length} teams`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendLoginDetailsToSelectedBatch = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const batchName = team.name.toLowerCase().replace(/\s+/g, '_');
    const username = batchName;
    const password = `std@${batchName}`;

    const emailResults = await sendLoginDetails(team.name, team.members, username, password);
    
    res.json({
      message: `Email sent to ${team.name}`,
      teamName: team.name,
      emailResults,
      success: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendLoginDetailsToAllTeams,
  sendLoginDetailsToSelectedBatch
};