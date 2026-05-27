const { getDb } = require('./db');

function updateScoresForMatch(matchId) {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match || match.status !== 'finished' || !match.result) return;

  const predictions = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(matchId);
  const updatePred = db.prepare(
    'UPDATE predictions SET is_correct = ? WHERE id = ?'
  );

  db.transaction(() => {
    for (const pred of predictions) {
      updatePred.run(pred.prediction === match.result ? 1 : 0, pred.id);
    }
  })();
}

function getLeaderboard() {
  const db = getDb();
  const players = db.prepare('SELECT * FROM players').all();

  return players.map((player) => {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_predictions,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect
      FROM predictions
      WHERE player_id = ?
    `).get(player.id);

    const streak = computeStreak(player.id);

    return {
      id: player.id,
      name: player.name,
      points: stats.correct || 0,
      total_predictions: stats.total_predictions || 0,
      correct: stats.correct || 0,
      incorrect: stats.incorrect || 0,
      streak,
      created_at: player.created_at,
    };
  }).sort((a, b) => b.points - a.points || b.total_predictions - a.total_predictions);
}

function computeStreak(playerId) {
  const db = getDb();
  // Get finished predictions ordered by match kickoff desc
  const preds = db.prepare(`
    SELECT p.is_correct
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.player_id = ? AND m.status = 'finished' AND p.is_correct IS NOT NULL
    ORDER BY m.kickoff_time DESC
  `).all(playerId);

  let streak = 0;
  for (const pred of preds) {
    if (pred.is_correct === 1) streak++;
    else break;
  }
  return streak;
}

module.exports = { updateScoresForMatch, getLeaderboard };
