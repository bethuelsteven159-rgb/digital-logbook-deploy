const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Route Imports
const authRoutes = require('./routes/auth');          // Auth teammate
const projectRoutes = require('./routes/projects');   // Your work[cite: 2]
const entryRoutes = require('./routes/entries');     // Teammate's entries work
const statsRoutes = require('./routes/stats');       // Your work
const externalRoutes = require('./routes/external'); // Your work

// Middleware Imports (Optional fallback check if Auth middleware exists)
let authenticateToken = (req, res, next) => next();
try {
  const authMiddleware = require('./middleware/auth');
  if (authMiddleware.authenticateToken) {
    authenticateToken = authMiddleware.authenticateToken;
  }
} catch (e) {
  console.log('⚠️ Auth middleware not found yet. Protected routes running in dev mode.');
}

const app = express();

app.use(cors());
app.use(express.json());

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/external', externalRoutes);

// Protected Routes
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/entries', authenticateToken, entryRoutes);
app.use('/api/stats', authenticateToken, statsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
