import { usePlayer } from '../lib/PlayerContext';

export default function NavBar({ activePage, onNavigate }) {
  const { player, logout } = usePlayer();

  const tabs = [
    { id: 'matches', label: '⚽ Matches' },
    { id: 'leaderboard', label: '🏆 Board' },
    { id: 'bracket', label: '📊 Bracket' },
    { id: 'mypicks', label: '📋 Picks' },
  ];

  return (
    <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <span className="text-lg font-black text-white hidden sm:block">WC2026</span>
            <span className="text-lg hidden sm:block">⚽</span>
          </div>
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer border
                  ${activePage === tab.id
                    ? 'bg-purple-500/30 border-purple-400/50 text-white'
                    : 'bg-transparent border-transparent text-white/60 hover:text-white hover:bg-white/10'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 hidden sm:block">{player?.name}</span>
            <button
              onClick={logout}
              className="text-xs text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              title="Switch player"
            >
              ↩
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
