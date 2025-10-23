const Review = require("../models/Review");
const Team = require("../models/Team");
const Column = require("../models/Column");

const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createReview = async (req, res) => {
  try {
    await Review.updateMany({}, { isActive: false });
    const review = new Review({ ...req.body, isActive: true });
    await review.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const activateReview = async (req, res) => {
  try {
    await Review.updateMany({}, { isActive: false });
    const review = await Review.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getActiveReview = async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    res.json(activeReview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetReviewData = async (req, res) => {
  try {
    const reviewId = req.params.id;
    await Team.updateMany(
      {},
      { $unset: { [`reviewData.${reviewId}`]: "" } }
    );
    res.json({ message: "Review data reset successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    await Team.updateMany(
      {},
      { $unset: { [`reviewData.${reviewId}`]: "" } }
    );
    await Column.deleteMany({ reviewId });
    await Review.findByIdAndDelete(reviewId);
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllReviews,
  createReview,
  activateReview,
  getActiveReview,
  resetReviewData,
  deleteReview
};