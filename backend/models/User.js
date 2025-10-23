const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  role: String,
  assignedSections: [String],
  assignedBatch: String,
});

module.exports = mongoose.model("User", userSchema);