const express = require("express");
const router = express.Router();
const {
  getAllReviews,
  createReview,
  activateReview,
  getActiveReview,
  resetReviewData,
  deleteReview
} = require("../controllers/reviewController");

router.get("/", getAllReviews);
router.post("/", createReview);
router.put("/:id/activate", activateReview);
router.get("/active", getActiveReview);
router.delete("/:id/reset", resetReviewData);
router.delete("/:id", deleteReview);

module.exports = router;