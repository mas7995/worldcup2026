import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { usePlayer } from '../lib/PlayerContext';
import { sortedRounds, toCT, toCTDateKey } from '../lib/utils';
import MatchCard from '../components/MatchCard';
import confetti from 'canvas-confetti';

export default function MatchesPage() {
  const { player } = usePlayer();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [activeRound, setActiveRound] = useState(null);
  const [activeDate, setActiveDate] = useState(null);
  const [view, setView] = useState('date'); // 'date' | 'group'
  const [loading, setLoading] = useState(true);
  const prevCorrect = useRef(0);

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
      for (const p of predData) predMap[p.match_id] = p.prediction;

      if (player) {
        const newCorrect = predData.filter(p => p.is_correct === 1).length;
        if (newCorrect > prevCorrect.current) {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 },
            colors: ['#a855f7', '#ec4899', '#f59e0b', '#22c55e'] });
        }
        prevCorrect.current = newCorrect;
      }

      setPredictions(predMap);

      // Default round: first with upcoming/live matches
      setActiveRound(prev => {
        if (prev) return prev;
        const rounds = sortedRounds(matchData);
        return rounds.find(r => matchData.filter(m => m.round === r).some(m => m.status !== 'finished')) || rounds[0];
      });

      // Default date: today in CT if there are matches, else next upcoming match day
      setActiveDate(prev => {
        if (prev) return prev;
        const today = toCTDateKey(new Date().toISOString());
        const dates = [...new Set(matchData.map(m => toCTDateKey(m.kickoff_time)))].sort();
        return dates.includes(today)
          ? today
          : dates.find(d => d >= today) || dates[dates.length - 1];
      });
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
  const today = toCTDateKey(new Date().toISOString());

  // All unique match dates in CT, sorted
  const allDates = [...new Set(matches.map(m => toCTDateKey(m.kickoff_time)))].sort();

  // Matches for current view
  const filteredMatches = view === 'group'
    ? matches.filter(m => m.round === activeRound)
    : matches.filter(m => toCTDateKey(m.kickoff_time) === activeDate);

  // Next Up: upcoming matches with no pick yet
  const nextUp = player
    ? matches
        .filter(m => m.status === 'upcoming' && !predictions[m.id] && new Date() < new Date(m.kickoff_time))
        .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
        .slice(0, 3)
    : [];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="card animate-pulse h-40" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

      {/* Next Up */}
      {nextUp.length > 0 && (
        <div className="card border-yellow-400/30">
          <h3 className="text-sm font-bold text-yellow-400 mb-3">⚡ Needs Your Pick</h3>
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

      {/* View toggle + filter tabs row */}
      <div className="space-y-2">
        {/* Toggle */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
          <button
            onClick={() => setView('date')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${view === 'date' ? 'bg-purple-500/50 text-white' : 'text-white/50 hover:text-white'}`}
          >
            📅 By Date
          </button>
          <button
            onClick={() => setView('group')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer
              ${view === 'group' ? 'bg-purple-500/50 text-white' : 'text-white/50 hover:text-white'}`}
          >
            🏟 By Group
          </button>
        </div>

        {/* Date tabs */}
        {view === 'date' && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {allDates.map(date => {
              const dayMatches = matches.filter(m => toCTDateKey(m.kickoff_time) === date);
              const hasLive = dayMatches.some(m => m.status === 'live');
              const allDone = dayMatches.every(m => m.status === 'finished');
              const unpicked = player
                ? dayMatches.filter(m => m.status === 'upcoming' && !predictions[m.id]).length
                : 0;
              const isToday = date === today;
              const label = isToday ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });

              return (
                <button
                  key={date}
                  onClick={() => setActiveDate(date)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border
                    ${activeDate === date
                      ? 'bg-purple-500/30 border-purple-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                >
                  <span className="flex items-center gap-1">
                    {hasLive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />}
                    {label}
                  </span>
                  <span className={`text-[10px] font-normal mt-0.5
                    ${unpicked > 0 ? 'text-yellow-400' : allDone ? 'text-white/25' : 'text-white/40'}`}>
                    {hasLive ? 'LIVE' : unpicked > 0 ? `${unpicked} to pick` : `${dayMatches.length} games`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Group/round tabs */}
        {view === 'group' && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
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
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                >
                  {hasLive ? '🟢 ' : ''}{round.replace('Group ', 'Grp ')}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Match cards */}
      <div className="space-y-3">
        {filteredMatches.length === 0 ? (
          <div className="card text-center text-white/40 py-8 text-sm">No matches for this selection.</div>
        ) : filteredMatches.map(match => (
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
