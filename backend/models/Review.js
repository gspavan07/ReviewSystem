const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  name: String,
  description: String,
  reviewDate: Date,
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Review", reviewSchema);