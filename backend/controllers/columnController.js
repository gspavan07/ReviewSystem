const Column = require("../models/Column");
const Review = require("../models/Review");

const getAllColumns = async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.json([]);
    }
    const columns = await Column.find({ reviewId: activeReview._id }).sort({ order: 1 });
    res.json(columns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createColumn = async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    const column = new Column({ ...req.body, reviewId: activeReview._id });
    await column.save();
    res.json(column);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateColumn = async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    const column = await Column.findOneAndUpdate(
      { name: req.params.name, reviewId: activeReview._id },
      req.body,
      { new: true }
    );
    res.json(column);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteColumn = async (req, res) => {
  try {
    const activeReview = await Review.findOne({ isActive: true });
    if (!activeReview) {
      return res.status(400).json({ error: "No active review found" });
    }
    await Column.findOneAndDelete({ name: req.params.name, reviewId: activeReview._id });
    res.json({ message: "Column deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllColumns,
  createColumn,
  updateColumn,
  deleteColumn
};