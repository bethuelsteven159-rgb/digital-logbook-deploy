const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

require("dotenv").config();

const projectRoutes = require(
  "./routes/projects",
);

const projectDetailsRoutes = require(
  "./routes/projectDetails",
);

const userRoutes = require(
  "./routes/users",
);

const requireAuth = require(
  "./middleware/authMiddleware",
);

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Digital Logbook API is running",
  });
});

/*
 * Existing project-management routes.
 *
 * These remain owned by the project
 * management teammate.
 */
app.use(
  "/api/projects",
  projectRoutes,
);

/*
 * Project Details / Entries.
 *
 * These require the real session JWT.
 */
app.use(
  "/api/projects",
  requireAuth,
  projectDetailsRoutes,
);

/*
 * Profile API.
 */
app.use(
  "/api/users",
  requireAuth,
  userRoutes,
);

app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(
  (error, _req, res, _next) => {
    console.error(
      "Unhandled API error:",
      error,
    );

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Internal server error",
      });
  },
);

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Backend server running on port ${PORT}`,
  );
});
