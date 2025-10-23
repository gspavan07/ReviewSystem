const mongoose = require("mongoose");

const uploadRequirementSchema = new mongoose.Schema({
  title: String,
  description: String,
  dueDate: Date,
  sections: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UploadRequirement", uploadRequirementSchema);