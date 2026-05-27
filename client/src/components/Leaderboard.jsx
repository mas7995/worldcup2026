import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { usePlayer } from '../lib/PlayerContext';

export default function Leaderboard() {
  const { player } = usePlayer();
  const [data, setData] = useState(null);
  const [prevPoints, setPrevPoints] = useState({});
  const [shakeId, setShakeId] = useState(null);

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadLeaderboard() {
    try {
      const newData = await api.getLeaderboard();
      setData(prev => {
        if (prev) {
          // Detect rank changes, shake changed entries
          for (const entry of newData.leaderboard) {
            const old = prev.leaderboard.find(e => e.id === entry.id);
            if (old && old.points !== entry.points) {
              setShakeId(entry.id);
              setTimeout(() => setShakeId(null), 500);
            }
          }
        }
        return newData;
      });
    } catch (e) {
      console.error(e);
    }
  }

  if (!data) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-white/10 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-white">🏆 Leaderboard</h2>
        <div className="text-right">
          <div className="text-2xl font-black text-yellow-400">${data.potValue}</div>
          <div className="text-xs text-white/50">{data.playerCount} players · $50 each</div>
        </div>
      </div>

      <div className="space-y-2">
        {data.leaderboard.map((entry, idx) => {
          const isMe = player?.id === entry.id;
          const isLeader = idx === 0 && entry.points > 0;
          const accuracy = entry.correct + entry.incorrect > 0
            ? Math.round((entry.correct / (entry.correct + entry.incorrect)) * 100)
            : null;

          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300
                ${isMe ? 'bg-purple-500/20 border border-purple-400/40' : 'bg-white/5'}
                ${isLeader ? 'ring-1 ring-yellow-400/50' : ''}
                ${shakeId === entry.id ? 'animate-shake' : ''}`}
            >
              <div className="text-lg font-black w-8 text-center">
                {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-1">
                  {entry.name}
                  {isMe && <span className="text-xs text-purple-300">(you)</span>}
                  {entry.streak >= 3 && <span className="text-xs">🔥×{entry.streak}</span>}
                </div>
                <div className="text-xs text-white/40">
                  {entry.correct}✓ {entry.incorrect}✗
                  {accuracy !== null ? ` · ${accuracy}%` : ''}
                  {entry.streak > 0 ? ` · ${entry.streak} streak` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-black ${isLeader ? 'text-yellow-400' : 'text-white'}`}>
                  {entry.points}
                </div>
                <div className="text-xs text-white/40">pts</div>
              </div>
            </div>
          );
        })}

        {data.leaderboard.length === 0 && (
          <div className="text-center text-white/40 py-6 text-sm">
            No players yet. Be the first to join!
          </div>
        )}
      </div>
    </div>
  );
}
