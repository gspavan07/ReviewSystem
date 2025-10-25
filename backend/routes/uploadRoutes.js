const express = require("express");
const router = express.Router();
const { tempStorage } = require("../middleware/upload");
const {
  getAllUploadRequirements,
  createUploadRequirement,
  updateUploadRequirement,
  deleteUploadRequirement,
  uploadFile,
  getAllSubmissions,
  downloadFile,
  unlockSubmission,
  getAllTemplates,
  uploadTemplate,
  updateTemplate,
  deleteTemplate,
  downloadTemplate
} = require("../controllers/uploadController");
const { fixCloudinaryAccess } = require("../utils/fixCloudinaryAccess");

// Upload Requirements
router.get("/upload-requirements", getAllUploadRequirements);
router.post("/upload-requirements", createUploadRequirement);
router.put("/upload-requirements/:id", updateUploadRequirement);
router.delete("/upload-requirements/:id", deleteUploadRequirement);

// File Submissions
router.post("/upload-file/:requirementId", tempStorage.single('file'), uploadFile);
router.get("/submissions", getAllSubmissions);
router.get("/download/:submissionId", downloadFile);
router.put("/submissions/:id/unlock", unlockSubmission);

// Templates
router.get("/templates", getAllTemplates);
router.post("/templates", tempStorage.single('file'), uploadTemplate);
router.put("/templates/:id", tempStorage.single('file'), updateTemplate);
router.delete("/templates/:id", deleteTemplate);
router.get("/templates/:id/download", downloadTemplate);

// Fix Cloudinary access for existing files
router.post("/fix-cloudinary-access", fixCloudinaryAccess);

module.exports = router;