import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const EMOJIS = ['🎉', '😭', '🤡', '🔥', '😤', '🏆', '💀', '🤣'];

export default function ReactionBar({ matchId, playerId }) {
  const [reactions, setReactions] = useState([]);
  const [myReaction, setMyReaction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getReactions(matchId).then((data) => {
      setReactions(data);
      const mine = data.find(r => r.player_id === playerId);
      if (mine) setMyReaction(mine.emoji);
    }).catch(() => {});
  }, [matchId, playerId]);

  async function handleReact(emoji) {
    if (loading) return;
    setLoading(true);
    try {
      const saved = await api.postReaction(playerId, matchId, emoji);
      setMyReaction(emoji);
      setReactions(prev => {
        const without = prev.filter(r => r.player_id !== playerId);
        return [...without, saved];
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Count emojis
  const counts = {};
  for (const r of reactions) {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-xs text-white/30 mr-1">React:</span>
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            className={`text-base px-1.5 py-0.5 rounded-lg transition-all duration-150 active:scale-110 cursor-pointer border
              ${myReaction === emoji ? 'bg-white/20 border-white/40' : 'bg-transparent border-transparent hover:bg-white/10'}`}
          >
            {emoji}{counts[emoji] ? <span className="text-xs text-white/60 ml-0.5">{counts[emoji]}</span> : null}
          </button>
        ))}
      </div>
      {reactions.length > 0 && (
        <div className="mt-1 text-xs text-white/40 flex flex-wrap gap-x-2">
          {reactions.map(r => (
            <span key={r.id}>{r.player_name}: {r.emoji}</span>
          ))}
        </div>
      )}
    </div>
  );
}
