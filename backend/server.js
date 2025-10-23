const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/database");

// Import routes
const teamRoutes = require("./routes/teamRoutes");
const columnRoutes = require("./routes/columnRoutes");
const userRoutes = require("./routes/userRoutes");
const { login, initializeDefaultUser } = require("./controllers/userController");
const reviewRoutes = require("./routes/reviewRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const importRoutes = require("./routes/importRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("dist"));

// API Routes
app.post("/api/login", login);
app.get("/api/init", initializeDefaultUser);
app.use("/api/teams", teamRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api", uploadRoutes);
app.use("/api", importRoutes);
app.use("/api", reportRoutes);

// Serve Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;