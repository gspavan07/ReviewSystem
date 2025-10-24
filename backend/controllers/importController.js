const Team = require("../models/Team");
const User = require("../models/User");
const xlsx = require("xlsx");
const fs = require("fs");
const { sendLoginDetails } = require('../utils/emailService');

// Store active import sessions
const importSessions = new Map();

function normalizeHeader(header) {
  return header.toString().trim().toLowerCase().replace(/\s+/g, "");
}

// SSE endpoint for import progress
const getImportProgress = (req, res) => {
  const sessionId = req.params.sessionId;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Store the response object for this session
  importSessions.set(sessionId, { res, sendProgress });

  // Send initial connection confirmation
  sendProgress({ type: 'connected', message: 'Connected to import progress' });

  // Clean up on client disconnect
  req.on('close', () => {
    importSessions.delete(sessionId);
  });
};

const importExcel = async (req, res) => {
  const sessionId = req.body.sessionId || Date.now().toString();
  
  const sendProgress = (data) => {
    const session = importSessions.get(sessionId);
    if (session) {
      session.sendProgress(data);
    }
  };
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    sendProgress({ type: 'progress', step: 'reading', message: 'Reading Excel file...', progress: 10 });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    sendProgress({ type: 'progress', step: 'parsing', message: 'Parsing data...', progress: 20 });

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
      sendProgress({ type: 'error', message: 'No valid data found in Excel file.' });
      throw new Error("No valid data found in Excel file.");
    }

    sendProgress({ type: 'progress', step: 'processing', message: `Processing ${validData.length} rows...`, progress: 30 });

    const createdTeams = [];
    const teamGroups = {};
    let currentBatchNo = "";
    let currentProjectTitle = "";
    let currentGuide = "";
    let processedRows = 0;

    for (const row of validData) {
      processedRows++;
      const rowProgress = 30 + (processedRows / validData.length) * 40;
      sendProgress({ 
        type: 'progress', 
        step: 'processing', 
        message: `Processing row ${processedRows}/${validData.length}...`, 
        progress: Math.round(rowProgress) 
      });
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

    const totalTeams = Object.keys(teamGroups).length;
    let createdCount = 0;
    
    sendProgress({ 
      type: 'progress', 
      step: 'creating', 
      message: `Creating ${totalTeams} teams...`, 
      progress: 70 
    });

    for (const [batchNo, teamData] of Object.entries(teamGroups)) {
      const teamName = `Batch ${batchNo}`;
      
      const existingTeam = await Team.findOne({ name: { $regex: new RegExp(`^${teamName}$`, 'i') } });
      if (existingTeam) {
        console.log(`⚠️ Skipping duplicate batch: ${teamName}`);
        sendProgress({ 
          type: 'progress', 
          step: 'creating', 
          message: `Skipped duplicate: ${teamName}`, 
          progress: 70 + (createdCount / totalTeams) * 20 
        });
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
      createdCount++;
      
      sendProgress({ 
        type: 'progress', 
        step: 'creating', 
        message: `Created team: ${teamName} (${createdCount}/${totalTeams})`, 
        progress: 70 + (createdCount / totalTeams) * 20 
      });
      
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

    sendProgress({ 
      type: 'progress', 
      step: 'complete', 
      message: `Import completed! Created ${createdTeams.length} teams`, 
      progress: 100 
    });

    fs.unlinkSync(req.file.path);

    // Clean up session after a delay
    setTimeout(() => {
      importSessions.delete(sessionId);
    }, 5000);

    res.json({
      message: `✅ Successfully imported ${createdTeams.length} teams`,
      teams: createdTeams,
      sessionId
    });
  } catch (error) {
    console.error("Excel import error:", error);
    sendProgress({ type: 'error', message: error.message });
    
    // Clean up session on error
    setTimeout(() => {
      importSessions.delete(sessionId);
    }, 5000);
    
    res.status(500).json({ error: error.message });
  }
};

module.exports = { importExcel, getImportProgress };