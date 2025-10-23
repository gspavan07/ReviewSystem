const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema({
  name: String,
  type: String,
  inputType: String,
  options: [String],
  maxMarks: Number,
  order: { type: Number, default: 0 },
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
});

module.exports = mongoose.model("Column", columnSchema);