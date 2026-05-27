const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { syncMatchResults } = require('./apiSync');
require('./db'); // init schema on startup

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/players', require('./routes/players'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/admin', require('./routes/admin'));

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Poll for scores every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const { getDb } = require('./db');
  const db = getDb();
  const liveOrSoon = db.prepare(`
    SELECT COUNT(*) as cnt FROM matches
    WHERE status IN ('live', 'upcoming')
    AND kickoff_time <= datetime('now', '+3 hours')
    AND kickoff_time >= datetime('now', '-3 hours')
  `).get();

  if (liveOrSoon.cnt > 0) {
    console.log('[cron] Syncing match results...');
    const result = await syncMatchResults();
    console.log('[cron] Sync done:', result);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Auto-seed on startup
  try {
    require('./seed');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
});
