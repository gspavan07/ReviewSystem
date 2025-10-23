const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  name: String,
  description: String,
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Review", reviewSchema);