import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { usePlayer } from '../lib/PlayerContext';

export default function PlayerSelect({ onDone }) {
  const { login } = usePlayer();
  const [players, setPlayers] = useState([]);
  const [mode, setMode] = useState('select'); // 'select' | 'register'
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    api.getPlayers().then(data => {
      setPlayers(data);
      setPlayerCount(data.length);
    });
  }, []);

  async function handleSelect(player) {
    login(player);
    onDone?.();
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const player = await api.createPlayer(newName.trim());
      login(player);
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const isFull = playerCount >= 8;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl">⚽</div>
          <h1 className="text-3xl font-black text-white">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              World Cup 2026
            </span>
          </h1>
          <p className="text-white/60 text-sm">Pick a player to get started</p>
        </div>

        {/* Pot display */}
        {playerCount > 0 && (
          <div className="card text-center">
            <div className="text-3xl font-black text-yellow-400">${playerCount * 50}</div>
            <div className="text-sm text-white/60">in the pot · {playerCount}/8 players</div>
          </div>
        )}

        {/* Player list */}
        {players.length > 0 && (
          <div className="card space-y-2">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Who are you?</h3>
            {players.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/15 rounded-xl transition-all duration-150 active:scale-98 cursor-pointer border border-white/10 font-bold"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Register */}
        {!isFull ? (
          <div className="card">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">
              {players.length === 0 ? 'Join the game' : "I'm not on the list yet"}
            </h3>
            <form onSubmit={handleRegister} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Your first name"
                maxLength={30}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-purple-400 focus:bg-white/15"
              />
              <button
                type="submit"
                disabled={loading || !newName.trim()}
                className="btn-primary px-4 py-2"
              >
                {loading ? '...' : 'Join'}
              </button>
            </form>
            {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
          </div>
        ) : (
          <div className="card text-center text-white/50 text-sm">
            🔒 Game is full (8 players max)
          </div>
        )}
      </div>
    </div>
  );
}
