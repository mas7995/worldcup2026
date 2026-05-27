import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { usePlayer } from '../lib/PlayerContext';
import { flagEmoji, toCT, resultLabel } from '../lib/utils';

export default function MyPicksPage() {
  const { player } = usePlayer();
  const [preds, setPreds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player) return;
    api.getPredictions(player.id)
      .then(data => setPreds(data.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [player]);

  if (!player) return null;

  const finished = preds.filter(p => p.status === 'finished');
  const upcoming = preds.filter(p => p.status !== 'finished');
  const correct = finished.filter(p => p.is_correct === 1);
  const incorrect = finished.filter(p => p.is_correct === 0);
  const accuracy = finished.length > 0 ? Math.round((correct.length / finished.length) * 100) : null;

  // Best streak
  let bestStreak = 0, cur = 0;
  for (const p of finished) {
    if (p.is_correct === 1) { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="card animate-pulse h-32" />
        <div className="card animate-pulse h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Stats */}
      <div className="card">
        <h2 className="text-xl font-black mb-4">{player.name}'s Stats</h2>
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Points" value={correct.length} color="text-yellow-400" />
          <StatBox label="Accuracy" value={accuracy !== null ? `${accuracy}%` : '—'} color="text-green-400" />
          <StatBox label="Correct" value={correct.length} color="text-green-400" />
          <StatBox label="Best Streak" value={bestStreak > 0 ? `${bestStreak}🔥` : '—'} color="text-orange-400" />
        </div>
      </div>

      {/* Upcoming picks */}
      {upcoming.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">
            Upcoming Picks ({upcoming.length})
          </h3>
          <div className="space-y-2">
            {upcoming.map(p => (
              <PredRow key={p.id} pred={p} />
            ))}
          </div>
        </div>
      )}

      {/* Past picks */}
      {finished.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">
            Past Picks ({finished.length})
          </h3>
          <div className="space-y-2">
            {[...finished].reverse().map(p => (
              <PredRow key={p.id} pred={p} showResult />
            ))}
          </div>
        </div>
      )}

      {preds.length === 0 && (
        <div className="card text-center text-white/40 py-10">
          No predictions yet!<br />
          <span className="text-sm">Head to Matches to make your picks ⚽</span>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="text-center bg-white/5 rounded-xl p-3">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}

function PredRow({ pred, showResult }) {
  const isLocked = new Date() >= new Date(pred.kickoff_time);
  const correct = pred.is_correct === 1;
  const wrong = pred.is_correct === 0;

  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl text-sm
      ${correct ? 'bg-green-500/10 border border-green-500/20' :
        wrong ? 'bg-red-500/10 border border-red-500/20' :
        'bg-white/5'}`}
    >
      <span className="text-base">{flagEmoji(pred.team_a_code)}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{pred.team_a} vs {pred.team_b}</div>
        <div className="text-xs text-white/40">{toCT(pred.kickoff_time)} CT · {pred.round}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-xs">
          {pred.prediction === 'team_a' ? pred.team_a : pred.prediction === 'team_b' ? pred.team_b : 'Draw'}
        </div>
        {showResult && pred.result && (
          <div className="text-xs text-white/40">
            {correct ? '✅' : '❌'} {resultLabel(pred.result, pred.team_a, pred.team_b)}
          </div>
        )}
        {!showResult && isLocked && <div className="text-xs text-white/30">🔒</div>}
        {!showResult && !isLocked && (
          <div className="text-xs text-green-400/70">editable</div>
        )}
      </div>
    </div>
  );
}
