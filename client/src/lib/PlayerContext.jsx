import { createContext, useContext, useState, useEffect } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [player, setPlayer] = useState(() => {
    try {
      const stored = localStorage.getItem('wc2026_player');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (p) => {
    setPlayer(p);
    localStorage.setItem('wc2026_player', JSON.stringify(p));
  };

  const logout = () => {
    setPlayer(null);
    localStorage.removeItem('wc2026_player');
  };

  return (
    <PlayerContext.Provider value={{ player, login, logout }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
