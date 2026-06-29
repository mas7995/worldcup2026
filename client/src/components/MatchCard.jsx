import { useState } from 'react';
import { flagEmoji, toCT, resultLabel, isKnockout } from '../lib/utils';
import { api } from '../lib/api';
import { usePlayer } from '../lib/PlayerContext';
import Countdown from './Countdown';
import ReactionBar from './ReactionBar';

const EMOJIS = ['🎉', '😭', '🤡', '🔥', '😤', '🏆', '💀', '🤣'];

function RecordBadge({ record }) {
  const { w, d, l } = record;
  if (w === 0 && d === 0 && l === 0) return null;
  return (
    <div className="mt-1 text-[11px] text-white/40 font-semibold tracking-wide">
      <span className="text-green-400/80">{w}W</span>
      {' · '}
      <span className="text-yellow-400/70">{d}D</span>
      {' · '}
      <span className="text-red-400/70">{l}L</span>
    </div>
  );
}

export default function MatchCard({ match, prediction, onPredictionChange, teamRecords }) {
  const { player } = usePlayer();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLocked = new Date() >= new Date(match.kickoff_time);
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  async function handlePredict(value) {
    if (!player || isLocked) return;
    if (prediction === value) return;
    setSaving(true);
    setError('');
    try {
      await api.savePrediction(player.id, match.id, value);
      onPredictionChange?.(match.id, value);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const correct = isFinished && prediction && prediction === match.result;
  const wrong = isFinished && prediction && prediction !== match.result;

  return (
    <div className={`card transition-all duration-300 ${
      isLive ? 'border-green-400/50 shadow-green-500/20 shadow-lg' :
      correct ? 'border-green-400/50' :
      wrong ? 'border-red-400/30' : ''
    }`}>
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">{match.round}{match.match_day ? ` · ${match.match_day}` : ''}</span>
          {isLive && (
            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isLocked && <Countdown kickoffTime={match.kickoff_time} />}
          {correct && <span className="text-lg">✅</span>}
          {wrong && <span className="text-lg">❌</span>}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex-1 text-center">
          <div className="text-2xl mb-1">{flagEmoji(match.team_a_code)}</div>
          <div className="font-bold text-sm leading-tight">{match.team_a}</div>
          {!isFinished && teamRecords?.[match.team_a] && (
            <RecordBadge record={teamRecords[match.team_a]} />
          )}
          {isFinished && match.score_a !== null && (
            <div className={`text-2xl font-black mt-1 ${match.result === 'team_a' ? 'text-green-400' : 'text-white/60'}`}>
              {match.score_a}
            </div>
          )}
        </div>

        <div className="text-center px-2">
          {isFinished && match.score_a !== null ? (
            <div className="text-white/40 text-xs">FT</div>
          ) : isLive ? (
            <div className="text-green-400 text-xs font-bold">VS</div>
          ) : (
            <div>
              <div className="text-white/40 text-xs">{new Date(match.kickoff_time).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' })}</div>
              <div className="text-white/70 text-sm font-bold">{new Date(match.kickoff_time).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
              <div className="text-white/30 text-xs">CT</div>
            </div>
          )}
        </div>

        <div className="flex-1 text-center">
          <div className="text-2xl mb-1">{flagEmoji(match.team_b_code)}</div>
          <div className="font-bold text-sm leading-tight">{match.team_b}</div>
          {!isFinished && teamRecords?.[match.team_b] && (
            <RecordBadge record={teamRecords[match.team_b]} />
          )}
          {isFinished && match.score_b !== null && (
            <div className={`text-2xl font-black mt-1 ${match.result === 'team_b' ? 'text-green-400' : 'text-white/60'}`}>
              {match.score_b}
            </div>
          )}
        </div>
      </div>

      {/* Prediction buttons */}
      {player && !isFinished && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handlePredict('team_a')}
            disabled={isLocked || saving}
            className={`prediction-btn ${prediction === 'team_a' ? 'prediction-btn-active-a' : 'prediction-btn-inactive'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {flagEmoji(match.team_a_code)} {match.team_a}
          </button>
          {!isKnockout(match.round) && (
            <button
              onClick={() => handlePredict('draw')}
              disabled={isLocked || saving}
              className={`prediction-btn ${prediction === 'draw' ? 'prediction-btn-active-draw' : 'prediction-btn-inactive'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              🤝 Draw
            </button>
          )}
          <button
            onClick={() => handlePredict('team_b')}
            disabled={isLocked || saving}
            className={`prediction-btn ${prediction === 'team_b' ? 'prediction-btn-active-b' : 'prediction-btn-inactive'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {flagEmoji(match.team_b_code)} {match.team_b}
          </button>
        </div>
      )}

      {/* Locked / no player state */}
      {player && isLocked && !isFinished && !prediction && (
        <div className="text-center text-white/40 text-xs mt-2 py-1 border border-white/10 rounded-lg">
          🔒 No prediction made
        </div>
      )}
      {player && prediction && !isFinished && isLocked && (
        <div className="text-center text-white/60 text-xs mt-2">
          🔒 Locked: <span className="font-bold text-white/80">{resultLabel(prediction, match.team_a, match.team_b)}</span>
        </div>
      )}
      {player && isFinished && prediction && (
        <div className={`text-center text-xs mt-2 py-1 rounded-lg ${correct ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {correct ? '✅' : '❌'} You picked: <strong>{resultLabel(prediction, match.team_a, match.team_b)}</strong>
          {' · '}Result: <strong>{resultLabel(match.result, match.team_a, match.team_b)}</strong>
        </div>
      )}

      {error && <div className="text-red-400 text-xs mt-1 text-center">{error}</div>}

      {/* Reactions */}
      {(isLive || isFinished) && player && (
        <ReactionBar matchId={match.id} playerId={player.id} />
      )}
    </div>
  );
}
