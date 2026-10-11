require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
