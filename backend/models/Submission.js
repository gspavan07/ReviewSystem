const mongoose = require("mongoose");

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

module.exports = mongoose.model("Submission", submissionSchema);