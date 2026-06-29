import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { usePlayer } from '../lib/PlayerContext';
import { flagEmoji, toCT, resultLabel } from '../lib/utils';

export default function MyPicksPage() {
  const { player: me } = usePlayer();
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState(me?.id);
  const [preds, setPreds] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingPreds, setLoadingPreds] = useState(false);

  // Load player list once
  useEffect(() => {
    api.getPlayers()
      .then(list => {
        // Put "me" first, then alphabetical
        const sorted = [...list].sort((a, b) => {
          if (a.id === me?.id) return -1;
          if (b.id === me?.id) return 1;
          return a.name.localeCompare(b.name);
        });
        setPlayers(sorted);
      })
      .catch(console.error)
      .finally(() => setLoadingPlayers(false));
  }, [me?.id]);

  // Load predictions whenever selected player changes
  useEffect(() => {
    if (!selectedId) return;
    setLoadingPreds(true);
    api.getPredictions(selectedId)
      .then(data => setPreds(data.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))))
      .catch(console.error)
      .finally(() => setLoadingPreds(false));
  }, [selectedId]);

  const selectedPlayer = players.find(p => p.id === selectedId);
  const isMe = selectedId === me?.id;

  const finished = preds.filter(p => p.status === 'finished');
  const upcoming = preds.filter(p => p.status !== 'finished');
  const correct = finished.filter(p => p.is_correct === 1);
  const accuracy = finished.length > 0 ? Math.round((correct.length / finished.length) * 100) : null;

  let bestStreak = 0, cur = 0;
  for (const p of finished) {
    if (p.is_correct === 1) { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

      {/* Player selector */}
      {loadingPlayers ? (
        <div className="flex gap-2 overflow-hidden">
          {[1,2,3].map(i => <div key={i} className="h-9 w-20 rounded-xl bg-white/10 animate-pulse" />)}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
            {players.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-bold border transition-all cursor-pointer flex-shrink-0
                  ${selectedId === p.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400/50 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                {p.name}
                {p.id === me?.id && (
                  <span className={`text-[10px] font-black px-1 py-0.5 rounded-md
                    ${selectedId === p.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
                    you
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats for selected player */}
      {selectedPlayer && (
        <div className="card">
          <h2 className="text-lg font-black mb-3">
            {isMe ? 'Your Stats' : `${selectedPlayer.name}'s Stats`}
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="Points" value={correct.length} color="text-yellow-400" />
            <StatBox label="Accuracy" value={accuracy !== null ? `${accuracy}%` : '—'} color="text-green-400" />
            <StatBox label="Correct" value={correct.length} color="text-green-400" />
            <StatBox label="Best Streak" value={bestStreak > 0 ? `${bestStreak}🔥` : '—'} color="text-orange-400" />
          </div>
        </div>
      )}

      {loadingPreds ? (
        <div className="space-y-2">
          <div className="card animate-pulse h-24" />
          <div className="card animate-pulse h-24" />
        </div>
      ) : (
        <>
          {/* Upcoming picks */}
          {upcoming.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">
                Upcoming Picks ({upcoming.length})
              </h3>
              <div className="space-y-2">
                {upcoming.map(p => <PredRow key={p.id} pred={p} isMe={isMe} />)}
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
                {[...finished].reverse().map(p => <PredRow key={p.id} pred={p} showResult isMe={isMe} />)}
              </div>
            </div>
          )}

          {preds.length === 0 && selectedPlayer && (
            <div className="card text-center text-white/40 py-10">
              {isMe ? (
                <>No predictions yet!<br /><span className="text-sm">Head to Matches to make your picks ⚽</span></>
              ) : (
                <>{selectedPlayer.name} hasn't made any picks yet.</>
              )}
            </div>
          )}
        </>
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

function PredRow({ pred, showResult, isMe }) {
  const isLocked = new Date() >= new Date(pred.kickoff_time);
  const correct = pred.is_correct === 1;
  const wrong = pred.is_correct === 0;
  const pickLabel = pred.prediction === 'team_a' ? pred.team_a
    : pred.prediction === 'team_b' ? pred.team_b
    : 'Draw';

  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl text-sm
      ${correct ? 'bg-green-500/10 border border-green-500/20'
        : wrong ? 'bg-red-500/10 border border-red-500/20'
        : 'bg-white/5'}`}
    >
      <span className="text-base flex-shrink-0">{flagEmoji(pred.team_a_code)}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate text-sm">{pred.team_a} vs {pred.team_b}</div>
        <div className="text-xs text-white/40">{toCT(pred.kickoff_time)} CT · {pred.round}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`font-bold text-xs
          ${pred.prediction === 'team_a' ? 'text-blue-300'
            : pred.prediction === 'team_b' ? 'text-red-300'
            : 'text-yellow-300'}`}>
          {pickLabel}
        </div>
        {showResult && pred.result && (
          <div className="text-xs text-white/40">
            {correct ? '✅' : '❌'} {resultLabel(pred.result, pred.team_a, pred.team_b)}
          </div>
        )}
        {!showResult && isMe && !isLocked && (
          <div className="text-xs text-green-400/70">editable</div>
        )}
        {!showResult && isLocked && (
          <div className="text-xs text-white/25">🔒</div>
        )}
      </div>
    </div>
  );
}
