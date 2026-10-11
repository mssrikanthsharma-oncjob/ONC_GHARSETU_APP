require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const customersRouter = require('./routes/customers');
const propertiesRouter = require('./routes/properties');
const matchmakingRouter = require('./routes/matchmaking');
const dealsRouter = require('./routes/deals');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// API routes
app.use('/api/customers', customersRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/matchmaking', matchmakingRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React client in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
// All non-API routes return the React app (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
