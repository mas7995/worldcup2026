import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { usePlayer } from '../lib/PlayerContext';

export default function PlayerSelect({ onDone }) {
  const { login } = usePlayer();
  const [players, setPlayers] = useState([]);
  const [playerCount, setPlayerCount] = useState(0);

  // Login flow state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const pinRef = useRef(null);

  // Registration flow state
  const [showRegister, setShowRegister] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  useEffect(() => {
    api.getPlayers().then(data => {
      setPlayers(data);
      setPlayerCount(data.length);
    });
  }, []);

  // Auto-focus PIN input when a player is selected
  useEffect(() => {
    if (selectedPlayer) {
      setTimeout(() => pinRef.current?.focus(), 50);
    }
  }, [selectedPlayer]);

  function handleSelectPlayer(player) {
    setSelectedPlayer(player);
    setPin('');
    setPinError('');
  }

  async function handlePinSubmit(e) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setVerifying(true);
    setPinError('');
    try {
      const player = await api.verifyPin(selectedPlayer.id, pin);
      login(player);
      onDone?.();
    } catch (e) {
      setPinError(e.message === 'Wrong PIN' ? 'Wrong PIN. Try again.' : e.message);
      setPin('');
      pinRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!newName.trim()) return setRegisterError('Name is required');
    if (!/^\d{4}$/.test(newPin)) return setRegisterError('PIN must be 4 digits');
    if (newPin !== newPinConfirm) return setRegisterError('PINs do not match');

    setRegistering(true);
    setRegisterError('');
    try {
      const player = await api.createPlayer(newName.trim(), newPin);
      login(player);
      onDone?.();
    } catch (e) {
      setRegisterError(e.message);
    } finally {
      setRegistering(false);
    }
  }

  const isFull = false;

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
            <div className="text-sm text-white/60">in the pot · {playerCount} players</div>
          </div>
        )}

        {/* PIN entry for selected player */}
        {selectedPlayer ? (
          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-white/40 hover:text-white text-lg cursor-pointer"
              >
                ←
              </button>
              <h3 className="font-black text-lg">{selectedPlayer.name}</h3>
            </div>
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Enter your PIN</label>
                <input
                  ref={pinRef}
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={pin}
                  onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                  placeholder="••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-white/20 outline-none focus:border-purple-400 focus:bg-white/15"
                />
              </div>
              {pinError && <div className="text-red-400 text-sm text-center">{pinError}</div>}
              <button
                type="submit"
                disabled={pin.length !== 4 || verifying}
                className="btn-primary w-full py-3"
              >
                {verifying ? 'Checking...' : 'Enter'}
              </button>
            </form>
          </div>
        ) : showRegister ? (
          /* Registration form */
          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowRegister(false); setRegisterError(''); }}
                className="text-white/40 hover:text-white text-lg cursor-pointer"
              >
                ←
              </button>
              <h3 className="font-black text-lg">Join the game</h3>
            </div>
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={e => { setNewName(e.target.value); setRegisterError(''); }}
                placeholder="Your first name"
                maxLength={30}
                autoFocus
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-purple-400 focus:bg-white/15"
              />
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Choose a 4-digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setRegisterError(''); }}
                  placeholder="••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-center text-xl tracking-widest placeholder-white/20 outline-none focus:border-purple-400 focus:bg-white/15"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPinConfirm}
                  onChange={e => { setNewPinConfirm(e.target.value.replace(/\D/g, '')); setRegisterError(''); }}
                  placeholder="••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-center text-xl tracking-widest placeholder-white/20 outline-none focus:border-purple-400 focus:bg-white/15"
                />
              </div>
              {registerError && <div className="text-red-400 text-sm text-center">{registerError}</div>}
              <button
                type="submit"
                disabled={registering || !newName.trim() || newPin.length !== 4 || newPinConfirm.length !== 4}
                className="btn-primary w-full py-3"
              >
                {registering ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>
        ) : (
          /* Player list */
          <>
            {players.length > 0 && (
              <div className="card space-y-2">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Who are you?</h3>
                {players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayer(p)}
                    className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/15 rounded-xl transition-all duration-150 active:scale-98 cursor-pointer border border-white/10 font-bold flex items-center justify-between"
                  >
                    <span>{p.name}</span>
                    <span className="text-white/30 text-sm">🔒</span>
                  </button>
                ))}
              </div>
            )}

            {!isFull ? (
              <button
                onClick={() => { setShowRegister(true); setNewName(''); setNewPin(''); setNewPinConfirm(''); setRegisterError(''); }}
                className="w-full card text-center text-white/60 hover:text-white hover:bg-white/15 transition-all cursor-pointer border-dashed"
              >
                + {players.length === 0 ? 'Join the game' : "I'm not on the list yet"}
              </button>
            ) : (
              <div className="card text-center text-white/50 text-sm">
                🔒 Game is full (8 players max)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
