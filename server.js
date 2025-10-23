const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("dist"));

// Base multer setup for Excel imports
const excelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const uploadExcel = multer({ storage: excelStorage });

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb+srv://pavan:aditya1212@cluster0.vct1jht.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Schemas
const teamSchema = new mongoose.Schema(
  {
    name: String,
    members: String,
    projectTitle: String,
    guide: String,
    reviewData: {
      type: Object,
      default: {}
    },
    uploadLocked: {
      type: Boolean,
      default: false
    }
  },
  { strict: false }
);

const columnSchema = new mongoose.Schema({
  name: String,
  type: String,
  inputType: String,
  options: [String],
  maxMarks: Number,
  order: { type: Number, default: 0 },
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  role: String,
  assignedSections: [String],
  assignedBatch: String,
});

const uploadRequirementSchema = new mongoose.Schema({
  title: String,
  description: String,
  dueDate: Date,
  sections: [String], // Array of sections this requirement applies to
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  name: String,
  description: String,
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const submissionSchema = new mongoose.Schema({
  requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadRequirement' },
  batchName: String,
  fileName: String,
  originalName: String,
  filePath: String,
  cloudinaryPublicId: String,
  uploadedAt: { type: Date, default: Date.now },
  isLocked: { type: Boolean, default: false }
});

const templateSchema = new mongoose.Schema({
  title: String,
  description: String,
  fileName: String,
  originalName: String,
  filePath: String,
  cloudinaryPublicId: String,
  uploadedAt: { type: Date, default: Date.now }
});

const Team = mongoose.model("Team", teamSchema);
const Column = mongoose.model("Column", columnSchema);
const User = mongoose.model("User", userSchema);
const Review = mongoose.model("Review", reviewSchema);
const UploadRequirement = mongoose.model("UploadRequirement", uploadRequirementSchema);
const Submission = mongoose.model("Submission", submissionSchema);
const Template = mongoose.model("Template", templateSchema);

//
// 🧠 Helper: Normalize header names
//
function normalizeHeader(header) {
  return header.toString().trim().toLowerCase().replace(/\s+/g, ""); // remove spaces
}

//
// 🧠 Excel Import Route
//
app.post("/api/import-excel", uploadExcel.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log("Sheet names:", workbook.SheetNames);

    // Try to find correct header row automatically
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

    // Inspect header keys
    const headers = Object.keys(validData[0]);
    console.log("Excel Headers Detected:", headers);

    // Fetch custom columns for active review
    const activeReview = await Review.findOne({ isActive: true });
    const columns = activeReview ? await Column.find({ reviewId: activeReview._id }) : [];
    const createdTeams = [];

    // Grouping by batch number with carry-forward for merged cells
    const teamGroups = {};
    let currentBatchNo = "";
    let currentProjectTitle = "";
    let currentGuide = "";

    for (const row of validData) {
      // Map flexibly (ignore spaces and case)
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

      // Carry forward logic for merged cells
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

      // Use current values (carry-forward) and only process if we have both batch and student
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

        console.log(
          `✅ Added member "${memberName}" to Batch ${currentBatchNo}`
        );
      }
    }

    // Create team records
    for (const [batchNo, teamData] of Object.entries(teamGroups)) {
      const teamName = `Batch ${batchNo}`;
      
      // Check if batch already exists
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
      };

      // Skip adding columns during import - they will be added when columns are created for the review
      
      // Initialize review data
      newTeam.reviewData = {};

      const team = new Team(newTeam);
      await team.save();
      createdTeams.push(team);
      
      // Auto-create student user for this batch
      const batchName = team.name.toLowerCase().replace(/\s+/g, '_');
      const username = batchName;
      const password = `std@${batchName}`;
      
      // Check if student user already exists
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
        console.log(`✅ Created student user: ${username} / ${password} for batch: ${team.name}`);
      } else {
        console.log(`ℹ️ Student user ${username} already exists`);
      }
    }

    // Delete uploaded file after processing
    fs.unlinkSync(req.file.path);

    res.json({
      message: `✅ Successfully imported ${createdTeams.length} teams`,
      teams: createdTeams,
    });
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({ error: error.message });
  }
});

//
// 🧱 CRUD Routes
//
app.get("/api/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/teams", async (req, res) => {
  try {
    const team = new Team(req.body);
    await team.save();
    
    // Auto-create student user for this batch
    const batchName = team.name.toLowerCase().replace(/\s+/g, '_');
    const username = batchName;
    const password = `std@${batchName}`;
    
    // Check if student user already exists
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
    }
    
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/teams/:id", async (req, res) => {
  try {
    const { reviewerId, _absentMembers, ...updateData } = req.body;
    
    // Get active review
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    
    const team = await Team.findById(req.params.id);
    
    if (!team.reviewData) {
      team.reviewData = {};
    }
    if (!team.reviewData[activeReview._id]) {
      team.reviewData[activeReview._id] = {};
    }
    
    // Check if scoring is locked for this review for non-head users
    const isReviewLocked = team.reviewData[activeReview._id]._scoringLocked;
    if (isReviewLocked && (!req.body.isHead)) {
      return res.status(403).json({ error: "Scoring is locked for this review. Contact head to unlock." });
    }
    
    // Store absent members data
    if (_absentMembers) {
      team.reviewData[activeReview._id]._absentMembers = _absentMembers;
    }
    
    // Store data directly under active review (no reviewer separation)
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
    
    // Lock scoring for this review after first submission (only for reviewers)
    if (!req.body.isHead && !isReviewLocked) {
      team.reviewData[activeReview._id]._scoringLocked = true;
    }
    
    team.markModified('reviewData');
    await team.save();
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/teams/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (team) {
      // Delete associated student user
      const batchName = team.name.toLowerCase().replace(/\s+/g, '_');
      await User.findOneAndDelete({ username: batchName, role: 'student' });
    }
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: "Team deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/columns", async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.json([]);
    }
    const columns = await Column.find({ reviewId: activeReview._id }).sort({ order: 1 });
    res.json(columns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/columns", async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    const column = new Column({ ...req.body, reviewId: activeReview._id });
    await column.save();
    res.json(column);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/columns/:name", async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    const column = await Column.findOneAndUpdate(
      { name: req.params.name, reviewId: activeReview._id },
      req.body,
      { new: true }
    );
    res.json(column);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/columns/:name", async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    await Column.findOneAndDelete({ name: req.params.name, reviewId: activeReview._id });
    res.json({ message: "Column deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🧍 User Routes
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({
        role: user.role,
        assignedSections: user.assignedSections,
        assignedBatch: user.assignedBatch,
        username: user.username,
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (user) {
      res.json({
        role: user.role,
        assignedSections: user.assignedSections,
        assignedBatch: user.assignedBatch,
        username: user.username,
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload Requirements Routes
app.get("/api/upload-requirements", async (req, res) => {
  try {
    const requirements = await UploadRequirement.find().sort({ createdAt: -1 });
    res.json(requirements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload-requirements", async (req, res) => {
  try {
    const requirement = new UploadRequirement(req.body);
    await requirement.save();
    res.json(requirement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/upload-requirements/:id", async (req, res) => {
  try {
    const requirement = await UploadRequirement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(requirement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/upload-requirements/:id", async (req, res) => {
  try {
    const requirementId = req.params.id;
    
    // Find all submissions for this requirement
    const submissions = await Submission.find({ requirementId });
    console.log(`Found ${submissions.length} submissions to delete`);
    
    // Delete files from Cloudinary
    for (const submission of submissions) {
      console.log(`Processing submission:`, {
        id: submission._id,
        publicId: submission.cloudinaryPublicId,
        fileName: submission.fileName
      });
      
      if (submission.cloudinaryPublicId) {
        try {
          // Try deletion with raw resource type first (documents are stored as raw)
          let result = await cloudinary.uploader.destroy(submission.cloudinaryPublicId, { resource_type: 'raw' });
          console.log(`Deletion attempt (raw):`, result);
          
          // If not found, try without resource_type (defaults to image)
          if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(submission.cloudinaryPublicId);
            console.log(`Deletion attempt (default):`, result);
          }
          
          if (result.result === 'ok') {
            console.log('✅ Successfully deleted from Cloudinary');
          } else {
            console.log(`ℹ️ Final deletion result: ${result.result}`);
          }
        } catch (cloudinaryError) {
          console.error(`Cloudinary deletion error:`, cloudinaryError);
        }
      } else {
        console.log('No cloudinaryPublicId found for submission:', submission._id);
      }
    }
    
    // Delete all submissions for this requirement
    await Submission.deleteMany({ requirementId });
    
    // Delete the requirement
    await UploadRequirement.findByIdAndDelete(requirementId);
    
    res.json({ message: "Upload requirement and all submissions deleted" });
  } catch (error) {
    console.error('Delete requirement error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Temporary storage for multer
const tempStorage = multer({ dest: 'temp/' });

// File Upload Route
app.post("/api/upload-file/:requirementId", tempStorage.single('file'), async (req, res) => {
  try {
    const { batchName } = req.body;
    console.log('Upload - Batch name:', batchName);
    
    if (!batchName) {
      return res.status(400).json({ error: 'Batch name is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Check if any file already exists for this requirement and batch
    const existingSubmission = await Submission.findOne({
      requirementId: req.params.requirementId,
      batchName: batchName
    });
    
    if (existingSubmission && existingSubmission.isLocked) {
      fs.unlinkSync(req.file.path); // Clean up temp file
      return res.status(403).json({ error: 'File upload is locked. Contact head to unlock.' });
    }
    
    // Clean filename and batch name for Cloudinary
    const fileExt = path.extname(req.file.originalname);
    const cleanBatchName = batchName.replace(/\s+/g, '_');
    const cleanFileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._]/g, '_');
    const fileNameWithoutExt = cleanFileName.substring(0, cleanFileName.lastIndexOf('.')) || cleanFileName;
    
    // Upload to Cloudinary with extension in public_id
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `team_uploads/${cleanBatchName}`,
      public_id: `${cleanBatchName}_${fileNameWithoutExt}${fileExt}`,
      resource_type: "auto"
    });
    
    // Delete temp file
    fs.unlinkSync(req.file.path);
    
    if (existingSubmission) {
      // Delete old file from Cloudinary
      if (existingSubmission.cloudinaryPublicId) {
        try {
          // Try deletion with raw resource type first
          let result = await cloudinary.uploader.destroy(existingSubmission.cloudinaryPublicId, { resource_type: 'raw' });
          if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(existingSubmission.cloudinaryPublicId);
          }
          console.log(`Old file deletion result: ${result.result}`);
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
      }
      
      // Update existing submission with new file and lock it
      existingSubmission.fileName = req.file.originalname;
      existingSubmission.originalName = req.file.originalname;
      existingSubmission.filePath = result.secure_url;
      existingSubmission.cloudinaryPublicId = result.public_id;
      existingSubmission.uploadedAt = new Date();
      existingSubmission.isLocked = true;
      await existingSubmission.save();
      
      return res.json({ message: "File replaced and locked successfully", submission: existingSubmission });
    }
    
    const submission = new Submission({
      requirementId: req.params.requirementId,
      batchName,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      filePath: result.secure_url, // Cloudinary URL
      cloudinaryPublicId: result.public_id, // Cloudinary public ID
      isLocked: true // Lock after first upload
    });
    
    await submission.save();
    res.json({ message: "File uploaded and locked successfully", submission });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Submissions Route
app.get("/api/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find().populate('requirementId');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download File Route
app.get("/api/download/:submissionId", async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ error: "File not found" });
    }
    // Redirect to Cloudinary URL for download
    res.redirect(submission.filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Review Management Routes
app.get("/api/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    // Deactivate all existing reviews
    await Review.updateMany({}, { isActive: false });
    
    // Create new active review
    const review = new Review({ ...req.body, isActive: true });
    await review.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/reviews/:id/activate", async (req, res) => {
  try {
    // Deactivate all reviews
    await Review.updateMany({}, { isActive: false });
    
    // Activate selected review
    const review = await Review.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/reviews/active", async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    res.json(activeReview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/reviews/:id/reset", async (req, res) => {
  try {
    const reviewId = req.params.id;
    
    // Remove review data for this specific review from all teams
    await Team.updateMany(
      {},
      { $unset: { [`reviewData.${reviewId}`]: "" } }
    );
    
    res.json({ message: "Review data reset successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlock team scoring for active review
app.put("/api/teams/:id/unlock-scoring", async (req, res) => {
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
    
    // Unlock scoring for the active review
    team.reviewData[activeReview._id]._scoringLocked = false;
    team.markModified('reviewData');
    await team.save();
    
    res.json({ message: "Team scoring unlocked for current review", team });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlock file upload for team
app.put("/api/submissions/:id/unlock", async (req, res) => {
  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { isLocked: false },
      { new: true }
    );
    res.json({ message: "File upload unlocked", submission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/reviews/:id", async (req, res) => {
  try {
    const reviewId = req.params.id;
    
    // Remove review data from all teams
    await Team.updateMany(
      {},
      { $unset: { [`reviewData.${reviewId}`]: "" } }
    );
    
    // Delete all columns for this review
    await Column.deleteMany({ reviewId });
    
    // Delete the review
    await Review.findByIdAndDelete(reviewId);
    
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//
// 🧩 Create default head user if not exists
//
app.get("/api/init", async (req, res) => {
  try {
    const headUser = await User.findOne({ username: "head" });
    if (!headUser) {
      const defaultHead = new User({
        username: "head",
        password: "admin123",
        role: "head",
        assignedSections: [],
      });
      await defaultHead.save();
      console.log("✅ Default head user created: head / admin123");
    }
    res.json({ message: "Initialized", userExists: !!headUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Template Management Routes
app.get("/api/templates", async (req, res) => {
  try {
    const templates = await Template.find().sort({ uploadedAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/templates", tempStorage.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || !req.file) {
      return res.status(400).json({ error: 'Title and file are required' });
    }
    
    // Use title as public ID with extension
    const fileExt = path.extname(req.file.originalname);
    const cleanTitle = title.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'templates',
      public_id: cleanTitle + fileExt,
      resource_type: "auto"
    });
    
    // Delete temp file
    fs.unlinkSync(req.file.path);
    
    const template = new Template({
      title,
      description: description || '',
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      filePath: result.secure_url,
      cloudinaryPublicId: result.public_id
    });
    
    await template.save();
    res.json({ message: "Template uploaded successfully", template });
  } catch (error) {
    console.error('Template upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/templates/:id", tempStorage.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    // Update metadata
    template.title = title || template.title;
    template.description = description !== undefined ? description : template.description;
    
    // If new file is uploaded, replace the old one
    if (req.file) {
      // Delete old file from Cloudinary
      if (template.cloudinaryPublicId) {
        try {
          // Try deletion with raw resource type first
          let result = await cloudinary.uploader.destroy(template.cloudinaryPublicId, { resource_type: 'raw' });
          if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(template.cloudinaryPublicId);
          }
          console.log(`Old template deletion result: ${result.result}`);
        } catch (error) {
          console.error('Error deleting old template:', error);
        }
      }
      
      // Upload new file using title as public ID with extension
      const fileExt = path.extname(req.file.originalname);
      const cleanTitle = (title || template.title).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'templates',
        public_id: cleanTitle + fileExt,
        resource_type: "auto"
      });
      
      // Delete temp file
      fs.unlinkSync(req.file.path);
      
      // Update file info
      template.fileName = req.file.originalname;
      template.originalName = req.file.originalname;
      template.filePath = result.secure_url;
      template.cloudinaryPublicId = result.public_id;
    }
    
    await template.save();
    res.json({ message: "Template updated successfully", template });
  } catch (error) {
    console.error('Template update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/templates/:id", async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    console.log(`Deleting template: ${template.title}, Cloudinary ID: ${template.cloudinaryPublicId}`);
    
    // Delete from Cloudinary
    if (template.cloudinaryPublicId) {
      try {
        console.log(`Attempting to delete: ${template.cloudinaryPublicId}`);
        
        // First, list all resources in templates folder to debug
        try {
          const resources = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'templates/',
            max_results: 100,
            resource_type: 'auto'
          });
          console.log(`Found ${resources.resources.length} templates in Cloudinary:`);
          resources.resources.forEach(r => console.log(`  - ${r.public_id} (${r.resource_type})`));
        } catch (listError) {
          console.log('Could not list Cloudinary resources:', listError.message);
          // Try listing with different resource type
          try {
            const rawResources = await cloudinary.api.resources({
              type: 'upload',
              prefix: 'templates/',
              max_results: 100,
              resource_type: 'raw'
            });
            console.log(`Found ${rawResources.resources.length} raw templates:`);
            rawResources.resources.forEach(r => console.log(`  - ${r.public_id} (raw)`));
          } catch (rawError) {
            console.log('Could not list raw resources either:', rawError.message);
          }
        }
        
        // Try deletion with raw resource type (documents are stored as raw)
        let result = await cloudinary.uploader.destroy(template.cloudinaryPublicId, { resource_type: 'raw' });
        console.log(`Deletion attempt (raw):`, result);
        
        // If not found, try without resource_type (defaults to image)
        if (result.result === 'not found') {
          result = await cloudinary.uploader.destroy(template.cloudinaryPublicId);
          console.log(`Deletion attempt (default):`, result);
        }
        
        // If not found, try alternative formats
        if (result.result === 'not found') {
          const alternatives = [];
          
          // Try without extension
          const withoutExt = template.cloudinaryPublicId.replace(/\.[^.]+$/, '');
          alternatives.push(withoutExt);
          
          // Try with underscore format
          if (template.cloudinaryPublicId.includes('.')) {
            const underscoreFormat = template.cloudinaryPublicId.replace(/\.([^.]+)$/, '_$1');
            alternatives.push(underscoreFormat);
          }
          
          // Try each alternative
          for (const altId of alternatives) {
            console.log(`Trying alternative ID: ${altId}`);
            result = await cloudinary.uploader.destroy(altId);
            console.log(`Alternative deletion result:`, result);
            if (result.result === 'ok') break;
          }
        }
        
        if (result.result === 'ok') {
          console.log('✅ Successfully deleted from Cloudinary');
        } else {
          console.log(`ℹ️ Final deletion result: ${result.result}`);
        }
      } catch (cloudinaryError) {
        console.error(`Cloudinary deletion error:`, cloudinaryError);
      }
    }
    
    // Delete from database
    await Template.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error('Template deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/templates/:id/download", async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    // Redirect to Cloudinary URL for download
    res.redirect(template.filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//
// 🏠 Serve Frontend
//
// Reports endpoint
app.get("/api/reports", async (req, res) => {
  try {
    const { type, section } = req.query;
    const teams = await Team.find();
    const activeReview = await Review.findOne({ isActive: true });
    const columns = activeReview ? await Column.find({ reviewId: activeReview._id }).sort({ order: 1 }) : [];
    const users = await User.find({ role: 'reviewer' });
    
    let filteredTeams = teams;
    let filename = type;
    
    // Filter teams based on type
    if (type === 'section' && section) {
      filteredTeams = teams.filter(team => 
        team.name.replace('Batch ', '').charAt(0).toUpperCase() === section
      );
      filename = `section_${section}`;
    } else if (type === 'batch' && section) {
      filteredTeams = teams.filter(team => team.name === section);
      filename = `batch_${section.replace(/\s+/g, '_')}`;
    }
    
    // Generate Excel with hierarchical format
    const workbook = xlsx.utils.book_new();
    const worksheetData = [];
    
    if (type === 'attendance') {
      // Attendance report
      worksheetData.push(['Team', 'Member', 'Status']);
      filteredTeams.forEach(team => {
        worksheetData.push([team.name, '', '']); // Team header row
        const members = team.members.split(',').map(m => m.trim());
        members.forEach(member => {
          const isAbsent = activeReview && team.reviewData?.[activeReview._id]?._absentMembers?.[member];
          const status = isAbsent ? 'Absent' : 'Present';
          worksheetData.push(['', `  ${member}`, status]); // Indented member row
        });
      });
    } else if (type === 'submissions') {
      // Submissions report
      const submissions = await Submission.find().populate('requirementId');
      worksheetData.push(['Team', 'Requirement', 'File', 'Upload Date']);
      submissions.forEach(sub => {
        worksheetData.push([sub.batchName, sub.requirementId?.title || 'N/A', sub.originalName, new Date(sub.uploadedAt).toLocaleDateString()]);
      });
    } else {
      // Score reports with hierarchical format
      const headers = ['Team/Member', 'Roll No', 'Project Title', 'Guide'];
      columns.forEach(col => {
        headers.push(col.name);
      });
      headers.push('Total', 'Reviewers');
      worksheetData.push(headers);
      
      filteredTeams.forEach(team => {
        const members = team.members.split(',').map(m => m.trim());
        
        // Get reviewers for this team
        const sectionLetter = team.name.replace('Batch ', '').charAt(0).toUpperCase();
        const teamReviewers = users.filter(user => 
          user.assignedSections?.includes(sectionLetter) || user.assignedSections?.includes(team.name)
        ).map(user => user.username).join(', ') || 'None';
        
        // Team header row
        const teamRow = [team.name, '', team.projectTitle || '', team.guide || ''];
        columns.forEach(col => {
          if (col.type === 'team') {
            let value = activeReview && team.reviewData?.[activeReview._id]?.[col.name] || team[col.name] || '';
            // If dropdown column and no value, use first option as default
            if (!value && col.inputType === 'options' && col.options && col.options.length > 0) {
              value = col.options[0];
            }
            teamRow.push(value);
          } else {
            teamRow.push(''); // Empty for individual columns at team level
          }
        });
        teamRow.push('', teamReviewers); // Empty total, then reviewers for team row
        worksheetData.push(teamRow);
        
        // Member rows (indented)
        members.forEach(member => {
          // Extract name and roll number
          const rollMatch = member.match(/\(([^)]+)\)$/);
          const rollNo = rollMatch ? rollMatch[1] : '';
          const memberName = rollMatch ? member.replace(/\s*\([^)]+\)$/, '').trim() : member;
          
          const memberRow = [`  ${memberName}`, rollNo, '', '']; // Indented member name, roll no
          const isAbsent = activeReview && team.reviewData?.[activeReview._id]?._absentMembers?.[member];
          let total = 0;
          
          columns.forEach(col => {
            if (col.type === 'individual') {
              if (isAbsent) {
                memberRow.push('Absent');
              } else {
                let value = activeReview && team.reviewData?.[activeReview._id]?.[col.name]?.[member] || team[col.name]?.[member] || '';
                // If dropdown column and no value, use first option as default
                if (!value && col.inputType === 'options' && col.options && col.options.length > 0) {
                  value = col.options[0];
                }
                // Add to total if it's a number
                if (col.inputType === 'number' && value && !isNaN(parseFloat(value))) {
                  total += parseFloat(value);
                }
                memberRow.push(value);
              }
            } else {
              memberRow.push(''); // Empty for team columns at member level
            }
          });
          
          // Add total score and empty reviewers column
          memberRow.push(isAbsent ? 'Absent' : total, '');
          worksheetData.push(memberRow);
        });
        
        // Add empty row between teams for better readability
        worksheetData.push(['', '', '', '', ...Array(columns.length + 2).fill('')]);
      });
    }
    
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    const sheetName = type === 'review' && activeReview ? activeReview.name : 'Report';
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_report.xlsx"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
