const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
  title: String,
  description: String,
  fileName: String,
  originalName: String,
  filePath: String,
  cloudinaryPublicId: String,
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Template", templateSchema);