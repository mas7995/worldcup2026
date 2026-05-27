import { useState } from 'react';
import { PlayerProvider, usePlayer } from './lib/PlayerContext';
import PlayerSelect from './components/PlayerSelect';
import NavBar from './components/NavBar';
import MatchesPage from './pages/MatchesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MyPicksPage from './pages/MyPicksPage';
import AdminPage from './pages/AdminPage';

function AppInner() {
  const { player } = usePlayer();
  const [page, setPage] = useState('matches');

  if (window.location.pathname === '/admin') {
    return <AdminPage />;
  }

  if (!player) {
    return <PlayerSelect onDone={() => setPage('matches')} />;
  }

  return (
    <div className="min-h-screen">
      <NavBar activePage={page} onNavigate={setPage} />
      <div className="pb-8">
        {page === 'matches' && <MatchesPage />}
        {page === 'leaderboard' && <LeaderboardPage />}
        {page === 'mypicks' && <MyPicksPage />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppInner />
    </PlayerProvider>
  );
}
