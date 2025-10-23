const Team = require("../models/Team");
const User = require("../models/User");
const xlsx = require("xlsx");
const fs = require("fs");
const { sendLoginDetails } = require('../utils/emailService');

function normalizeHeader(header) {
  return header.toString().trim().toLowerCase().replace(/\s+/g, "");
}

const importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    let validData = [];
    for (let startRow = 0; startRow <= 10; startRow++) {
      const testData = xlsx.utils.sheet_to_json(worksheet, {
        range: startRow,
        defval: "",
      });
      if (
        testData.length &&
        !Object.keys(testData[0]).every((key) => key.includes("__EMPTY"))
      ) {
        validData = testData;
        console.log(`✅ Found valid data starting from row ${startRow + 1}`);
        break;
      }
    }

    if (!validData.length) {
      throw new Error("No valid data found in Excel file.");
    }

    const createdTeams = [];
    const teamGroups = {};
    let currentBatchNo = "";
    let currentProjectTitle = "";
    let currentGuide = "";

    for (const row of validData) {
      const mapped = {};
      for (const [key, val] of Object.entries(row)) {
        mapped[normalizeHeader(key)] = val;
      }

      const batchNo =
        mapped["batchno."] ||
        mapped["batchno"] ||
        mapped["batch"] ||
        mapped["teamno"] ||
        mapped["team"] ||
        mapped["sno"] ||
        mapped["slno"] ||
        "";

      if (batchNo && batchNo.toString().trim()) {
        currentBatchNo = batchNo.toString().trim();
      }

      const projectTitle =
        mapped["projecttitle"] || mapped["title"] || mapped["project"] || "";
      if (projectTitle && projectTitle.toString().trim()) {
        currentProjectTitle = projectTitle.toString().trim();
      }

      const guide =
        mapped["guide"] ||
        mapped["projectguide"] ||
        mapped["faculty"] ||
        mapped["mentor"] ||
        mapped["supervisor"] ||
        "";
      if (guide && guide.toString().trim()) {
        currentGuide = guide.toString().trim();
      }

      const rollNo =
        mapped["rollno."] ||
        mapped["rollno"] ||
        mapped["regno"] ||
        mapped["registrationno"] ||
        "";
      const studentName =
        mapped["nameofthestudent"] ||
        mapped["studentname"] ||
        mapped["name"] ||
        mapped["students"] ||
        mapped["fullname"] ||
        "";

      if (currentBatchNo && studentName && studentName.toString().trim()) {
        if (!teamGroups[currentBatchNo]) {
          teamGroups[currentBatchNo] = {
            members: [],
            projectTitle: currentProjectTitle,
            guide: currentGuide,
          };
        }

        const memberName = rollNo
          ? `${studentName.trim()} (${rollNo})`
          : studentName.trim();
        teamGroups[currentBatchNo].members.push(memberName);
      }
    }

    for (const [batchNo, teamData] of Object.entries(teamGroups)) {
      const teamName = `Batch ${batchNo}`;
      
      const existingTeam = await Team.findOne({ name: { $regex: new RegExp(`^${teamName}$`, 'i') } });
      if (existingTeam) {
        console.log(`⚠️ Skipping duplicate batch: ${teamName}`);
        continue;
      }
      
      const newTeam = {
        name: teamName,
        members: teamData.members.join(", "),
        projectTitle: teamData.projectTitle || "",
        guide: teamData.guide || "",
        reviewData: {}
      };

      const team = new Team(newTeam);
      await team.save();
      createdTeams.push(team);
      
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
        
        try {
          const emailResults = await sendLoginDetails(team.name, team.members, username, password);
          console.log(`📧 Email notification results for ${team.name}:`, emailResults);
        } catch (emailError) {
          console.error(`❌ Email notification failed for ${team.name}:`, emailError.message);
        }
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      message: `✅ Successfully imported ${createdTeams.length} teams`,
      teams: createdTeams,
    });
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { importExcel };