const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Route Imports
const authRoutes = require('./routes/auth');          // Auth teammate
const projectRoutes = require('./routes/projects');   // Your work
const entryRoutes = require('./routes/entries');     // Teammate's entries work
const statsRoutes = require('./routes/stats');       // Your work
const externalRoutes = require('./routes/external'); // Your work

const { authenticateToken } = require('./middleware/auth');

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
  console.log(`Backend server running on port ${PORT}`);
});
