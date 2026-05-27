import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { usePlayer } from '../lib/PlayerContext';
import { sortedRounds, toCT } from '../lib/utils';
import MatchCard from '../components/MatchCard';
import confetti from 'canvas-confetti';

export default function MatchesPage() {
  const { player } = usePlayer();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [activeRound, setActiveRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevCorrect = useState(0);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, [player]);

  async function loadAll() {
    try {
      const [matchData, predData] = await Promise.all([
        api.getMatches(),
        player ? api.getPredictions(player.id) : Promise.resolve([]),
      ]);
      setMatches(matchData);

      const predMap = {};
      for (const p of predData) {
        predMap[p.match_id] = p.prediction;
      }

      // Detect newly correct predictions → confetti
      if (player) {
        const newCorrect = predData.filter(p => p.is_correct === 1).length;
        if (newCorrect > prevCorrect[0]) {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#a855f7', '#ec4899', '#f59e0b', '#22c55e'],
          });
        }
        prevCorrect[0] = newCorrect;
      }

      setPredictions(predMap);

      // Default to first group round that has upcoming matches
      if (!activeRound) {
        const rounds = sortedRounds(matchData);
        const defaultRound = rounds.find(r => {
          const roundMatches = matchData.filter(m => m.round === r);
          return roundMatches.some(m => m.status === 'upcoming' || m.status === 'live');
        }) || rounds[0];
        setActiveRound(defaultRound);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handlePredictionChange(matchId, prediction) {
    setPredictions(prev => ({ ...prev, [matchId]: prediction }));
  }

  const rounds = sortedRounds(matches);
  const filteredMatches = matches.filter(m => m.round === activeRound);

  // Next up: upcoming matches missing predictions for this player
  const nextUp = player
    ? matches
        .filter(m => m.status === 'upcoming' && !predictions[m.id] && new Date() < new Date(m.kickoff_time))
        .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
        .slice(0, 3)
    : [];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="card animate-pulse h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Next Up */}
      {nextUp.length > 0 && (
        <div className="card border-yellow-400/30">
          <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
            ⚡ Needs Your Pick
          </h3>
          <div className="space-y-2">
            {nextUp.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                <div className="text-sm font-bold">{m.team_a} vs {m.team_b}</div>
                <div className="text-xs text-white/40">{toCT(m.kickoff_time)} CT</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {rounds.map(round => {
          const roundMatches = matches.filter(m => m.round === round);
          const hasLive = roundMatches.some(m => m.status === 'live');
          return (
            <button
              key={round}
              onClick={() => setActiveRound(round)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border
                ${activeRound === round
                  ? 'bg-purple-500/30 border-purple-400/50 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
            >
              {hasLive ? '🟢 ' : ''}{round.replace('Group ', 'Grp ')}
            </button>
          );
        })}
      </div>

      {/* Match cards */}
      <div className="space-y-3">
        {filteredMatches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictions[match.id]}
            onPredictionChange={handlePredictionChange}
          />
        ))}
      </div>
    </div>
  );
}
