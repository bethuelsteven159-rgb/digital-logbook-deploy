const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projects");
const projectDetailsRoutes = require("./routes/projectDetails");
const userRoutes = require("./routes/users");
const statsRoutes = require("./routes/stats");
const externalRoutes = require("./routes/external");

let requireAuth = (_req, _res, next) => next();
try {
  requireAuth = require("./middleware/authMiddleware");
} catch (e) {
  console.log("?? Auth middleware not found yet, running fallback mode.");
}

const app = express();

app.use(cors());
app.use(express.json());

// Public Routes
app.use("/api/auth", authRoutes);
app.use("/api/external", externalRoutes);

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Digital Logbook API is running",
  });
});

// Protected Routes
app.use("/api/projects", requireAuth, projectRoutes);
app.use("/api/projects", requireAuth, projectDetailsRoutes);
app.use("/api/users", requireAuth, userRoutes);
app.use("/api/stats", requireAuth, statsRoutes);

// 404 Handler
app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error);
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
