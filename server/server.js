const express = require('express');
const cors = require('cors');
require('dotenv').config();

const projectRoutes = require('./routes/projects');
const entryRoutes = require('./routes/entries');
const externalRoutes = require('./routes/external');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/external', externalRoutes);

// Quick test route to confirm server health
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'API is working' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
