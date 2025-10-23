const mongoose = require("mongoose");

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

module.exports = mongoose.model("Team", teamSchema);