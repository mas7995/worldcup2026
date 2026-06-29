import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { flagEmoji, toCTDate } from '../lib/utils';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export default function BracketPage() {
  const [data, setData] = useState(null);
  const [section, setSection] = useState('groups');
  const [activeGroup, setActiveGroup] = useState('A');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function load() {
      api.getBracket().then(setData).catch(console.error).finally(() => setLoading(false));
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-white/40 text-sm">Loading bracket…</div>;
  }
  if (!data) {
    return <div className="text-center py-20 text-red-400 text-sm">Failed to load bracket.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'groups', label: '📊 Groups' },
          { id: 'knockout', label: '🏆 Knockout' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer
              ${section === s.id
                ? 'bg-purple-500/30 border-purple-400/50 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'groups' && (
        <GroupStage data={data.groups} activeGroup={activeGroup} setActiveGroup={setActiveGroup} />
      )}
      {section === 'knockout' && (
        <KnockoutBracket data={data.knockout} />
      )}
    </div>
  );
}

// ─── Group Stage ─────────────────────────────────────────────────────────────

function GroupStage({ data, activeGroup, setActiveGroup }) {
  const group = data[activeGroup] || { matches: [], standings: [] };

  return (
    <div className="space-y-4">
      {/* Group selector */}
      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map(g => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`w-9 h-9 rounded-xl text-sm font-black border transition-all cursor-pointer
              ${activeGroup === g
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400/50 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Standings table */}
      <div className="card overflow-hidden !p-0">
        <div className="px-4 py-3 border-b border-white/10 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-black text-sm text-white">Group {activeGroup}</h3>
            <p className="text-xs text-white/40 mt-0.5">Top 2 advance · 8 best 3rd-place also advance</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-white/40 border-b border-white/10">
                <th className="text-left pl-4 pr-2 py-2 font-semibold">#</th>
                <th className="text-left px-2 py-2 font-semibold">Team</th>
                <th className="text-center px-2 py-2 font-semibold">P</th>
                <th className="text-center px-2 py-2 font-semibold">W</th>
                <th className="text-center px-2 py-2 font-semibold">D</th>
                <th className="text-center px-2 py-2 font-semibold">L</th>
                <th className="text-center px-2 py-2 font-semibold">GD</th>
                <th className="text-center px-2 pr-4 py-2 font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {group.standings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-white/30 py-6 text-xs">No matches played yet</td>
                </tr>
              ) : group.standings.map((t, i) => {
                const qualified = i < 2;
                const maybe = i === 2;
                return (
                  <tr
                    key={t.team}
                    className={`border-b border-white/5 last:border-0 transition-colors
                      ${qualified ? 'bg-green-500/10' : maybe ? 'bg-yellow-500/5' : ''}`}
                  >
                    <td className="pl-4 pr-2 py-2.5">
                      {qualified ? (
                        <span className="inline-flex w-5 h-5 rounded-full bg-green-500/30 text-green-300 text-[11px] items-center justify-center font-bold">{i+1}</span>
                      ) : maybe ? (
                        <span className="inline-flex w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-[11px] items-center justify-center font-bold">{i+1}</span>
                      ) : (
                        <span className="text-white/30 text-xs pl-1">{i+1}</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{flagEmoji(t.code)}</span>
                        <span className={`text-sm font-semibold ${qualified ? 'text-white' : 'text-white/70'}`}>{t.team}</span>
                      </span>
                    </td>
                    <td className="text-center px-2 py-2.5 text-white/50 text-xs">{t.p}</td>
                    <td className="text-center px-2 py-2.5 text-white/50 text-xs">{t.w}</td>
                    <td className="text-center px-2 py-2.5 text-white/50 text-xs">{t.d}</td>
                    <td className="text-center px-2 py-2.5 text-white/50 text-xs">{t.l}</td>
                    <td className={`text-center px-2 py-2.5 text-xs font-semibold
                      ${t.gd > 0 ? 'text-green-400' : t.gd < 0 ? 'text-red-400' : 'text-white/40'}`}>
                      {t.gd > 0 ? '+' : ''}{t.gd}
                    </td>
                    <td className="text-center px-2 pr-4 py-2.5 font-black text-white text-sm">{t.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group matches */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-1">Matches</h4>
        {group.matches.map(m => <GroupMatchRow key={m.id} match={m} />)}
      </div>
    </div>
  );
}

function GroupMatchRow({ match: m }) {
  const finished = m.status === 'finished';
  const isLive = m.status === 'live';
  const winA = m.result === 'team_a';
  const winB = m.result === 'team_b';

  return (
    <div className={`card py-2.5 ${isLive ? 'border-green-400/50 shadow-green-500/10 shadow-lg' : ''}`}>
      <div className="flex items-center gap-2">
        {/* Team A */}
        <div className={`flex-1 flex items-center gap-2 justify-end min-w-0
          ${winA ? 'text-white' : finished ? 'text-white/40' : 'text-white/80'}`}>
          <span className="text-sm font-semibold text-right truncate">{m.team_a}</span>
          <span className="text-xl flex-shrink-0">{flagEmoji(m.team_a_code)}</span>
        </div>

        {/* Score / vs */}
        <div className="flex flex-col items-center flex-shrink-0 w-14">
          {finished || isLive ? (
            <div className="flex items-center gap-1 font-black text-base leading-none">
              <span className={winA ? 'text-white' : m.result === 'draw' ? 'text-white/70' : 'text-white/35'}>{m.score_a ?? '?'}</span>
              <span className="text-white/25 text-sm">–</span>
              <span className={winB ? 'text-white' : m.result === 'draw' ? 'text-white/70' : 'text-white/35'}>{m.score_b ?? '?'}</span>
            </div>
          ) : (
            <span className="text-xs text-white/40 font-semibold">vs</span>
          )}
          {isLive && <span className="text-[10px] text-green-400 font-bold animate-pulse mt-0.5">LIVE</span>}
          {!finished && !isLive && <span className="text-[10px] text-white/30 mt-0.5">{toCTDate(m.kickoff_time)}</span>}
          {finished && <span className="text-[10px] text-white/30 mt-0.5">FT</span>}
        </div>

        {/* Team B */}
        <div className={`flex-1 flex items-center gap-2 min-w-0
          ${winB ? 'text-white' : finished ? 'text-white/40' : 'text-white/80'}`}>
          <span className="text-xl flex-shrink-0">{flagEmoji(m.team_b_code)}</span>
          <span className="text-sm font-semibold truncate">{m.team_b}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Knockout Bracket ─────────────────────────────────────────────────────────

const BRACKET_ROUNDS = [
  { key: 'Round of 32', label: 'Round of 32' },
  { key: 'Round of 16', label: 'Round of 16' },
  { key: 'Quarterfinals', label: 'Quarterfinals' },
  { key: 'Semifinals', label: 'Semifinals' },
  { key: 'Final', label: 'Final' },
];

function KnockoutBracket({ data }) {
  const finalMatch = (data['Final'] || [])[0];
  const champion = finalMatch?.result
    ? { name: finalMatch.result === 'team_a' ? finalMatch.team_a : finalMatch.team_b,
        code: finalMatch.result === 'team_a' ? finalMatch.team_a_code : finalMatch.team_b_code }
    : null;

  return (
    <div className="space-y-4">
      {champion && (
        <div className="card text-center space-y-2 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-yellow-500/20 border-yellow-400/40">
          <div className="text-4xl">{flagEmoji(champion.code)}</div>
          <div className="text-yellow-300 font-black text-lg">🏆 2026 World Champions</div>
          <div className="text-white font-bold text-xl">{champion.name}</div>
        </div>
      )}

      <p className="text-xs text-white/40 px-1">Swipe left to see later rounds →</p>

      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-3 items-start" style={{ minWidth: 'max-content' }}>
          {BRACKET_ROUNDS.map(({ key, label }) => {
            const matches = data[key] || [];
            if (matches.length === 0) return null;
            return (
              <div key={key} className="flex flex-col gap-2" style={{ width: '148px' }}>
                <div className="text-center py-1">
                  <span className="text-[11px] font-black text-white/50 uppercase tracking-wider">{label}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {matches.map(m => <KnockoutCard key={m.id} match={m} />)}
                </div>
              </div>
            );
          })}

          {/* Third place shown at the end */}
          {(data['Third Place'] || []).length > 0 && (
            <div className="flex flex-col gap-2" style={{ width: '148px' }}>
              <div className="text-center py-1">
                <span className="text-[11px] font-black text-white/50 uppercase tracking-wider">3rd Place</span>
              </div>
              {(data['Third Place'] || []).map(m => <KnockoutCard key={m.id} match={m} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KnockoutCard({ match: m }) {
  const isLive = m.status === 'live';
  const finished = m.status === 'finished';

  return (
    <div className={`rounded-xl border overflow-hidden text-xs
      ${isLive ? 'border-green-400/50 bg-green-500/5 shadow-green-500/20 shadow-md'
        : finished ? 'border-white/20 bg-white/10'
        : 'border-white/10 bg-white/5'}`}
    >
      <TeamSlot
        name={m.team_a} code={m.team_a_code} score={m.score_a}
        winner={m.result === 'team_a'} finished={finished}
      />
      <div className="border-t border-white/10" />
      <TeamSlot
        name={m.team_b} code={m.team_b_code} score={m.score_b}
        winner={m.result === 'team_b'} finished={finished}
      />
      {isLive && (
        <div className="text-center py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold animate-pulse">
          LIVE
        </div>
      )}
    </div>
  );
}

function TeamSlot({ name, code, score, winner, finished }) {
  const isTbd = !code || code === 'TBD';
  return (
    <div className={`flex items-center gap-1.5 px-2 py-2
      ${isTbd ? 'text-white/25'
        : winner ? 'bg-white/10 text-white font-bold'
        : finished ? 'text-white/40'
        : 'text-white/75'}`}
    >
      <span className="text-sm leading-none flex-shrink-0">{isTbd ? '🏴' : flagEmoji(code)}</span>
      <span className="flex-1 truncate text-xs">{isTbd ? 'TBD' : name}</span>
      {!isTbd && score !== null && score !== undefined && (
        <span className={`font-black text-sm flex-shrink-0 ${winner ? 'text-white' : 'text-white/40'}`}>{score}</span>
      )}
    </div>
  );
}
