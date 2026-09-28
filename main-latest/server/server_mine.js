const express = require("express");
const cors = require("cors");
require("dotenv").config();

const projectRoutes = require("./routes/projects");
const projectDetailsRoutes = require("./routes/projectDetails");
const devAuth = require("./middleware/devAuth");

const app = express();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:8443";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(devAuth);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Digital Logbook API is running",
  });
});

/* Existing project-management routes. */
app.use("/api/projects", projectRoutes);

/* Project Details / Entries routes. */
app.use("/api/projects", projectDetailsRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Digital Logbook API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  if (process.env.USE_FAKE_DB === "true") {
    console.log("Development mode: Project Details is using fake data");
  }

  if (
    process.env.DEV_BYPASS_AUTH === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.log("Development mode: authentication bypass enabled");
  }
});
