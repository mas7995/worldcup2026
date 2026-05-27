import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toCT, flagEmoji } from '../lib/utils';

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [matches, setMatches] = useState([]);
  const [audit, setAudit] = useState([]);
  const [players, setPlayers] = useState([]);
  const [tab, setTab] = useState('results');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [editMatch, setEditMatch] = useState(null);
  const [resultForm, setResultForm] = useState({ result: '', scoreA: '', scoreB: '' });

  async function handlePinSubmit(e) {
    e.preventDefault();
    try {
      await api.admin.getMatches(pin);
      setAuthed(true);
      loadAll();
    } catch {
      setError('Wrong PIN');
    }
  }

  async function loadAll() {
    try {
      const [m, a, p] = await Promise.all([
        api.admin.getMatches(pin),
        api.admin.getAudit(pin),
        api.getPlayers(),
      ]);
      setMatches(m);
      setAudit(a);
      setPlayers(p);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSetResult(matchId) {
    if (!resultForm.result) { setError('Select result'); return; }
    try {
      await api.admin.setResult(
        pin, matchId, resultForm.result,
        resultForm.scoreA ? parseInt(resultForm.scoreA) : null,
        resultForm.scoreB ? parseInt(resultForm.scoreB) : null
      );
      setMsg('Result saved!');
      setEditMatch(null);
      setResultForm({ result: '', scoreA: '', scoreB: '' });
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSync() {
    try {
      const res = await api.admin.sync(pin);
      setMsg(`Synced ${res.synced} matches`);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRemovePlayer(id, name) {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await api.admin.removePlayer(pin, id);
      setMsg(`Removed ${name}`);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleReset() {
    if (!confirm('NUCLEAR RESET: delete all predictions & players?')) return;
    if (!confirm('Are you SURE? This cannot be undone!')) return;
    try {
      await api.admin.reset(pin);
      setMsg('Game reset!');
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card w-full max-w-sm space-y-4">
          <h2 className="text-xl font-black text-center">⚙️ Admin Panel</h2>
          <form onSubmit={handlePinSubmit} className="flex gap-2">
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="PIN"
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-purple-400"
            />
            <button type="submit" className="btn-primary">Enter</button>
          </form>
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'results', label: '📝 Results' },
    { id: 'players', label: '👥 Players' },
    { id: 'audit', label: '📋 Audit' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">⚙️ Admin</h2>
        <div className="flex gap-2">
          <button onClick={handleSync} className="btn-secondary text-xs">🔄 Sync API</button>
          <button onClick={handleReset} className="text-xs bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-1.5 rounded-xl hover:bg-red-500/30 cursor-pointer">💀 Reset</button>
        </div>
      </div>

      {msg && <div className="bg-green-500/20 border border-green-500/40 text-green-300 text-sm px-3 py-2 rounded-xl">{msg}</div>}
      {error && <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-3 py-2 rounded-xl">{error}</div>}

      <div className="flex gap-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold cursor-pointer border transition-all
              ${tab === t.id ? 'bg-purple-500/30 border-purple-400/50 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'results' && (
        <div className="space-y-2">
          {matches.map(m => (
            <div key={m.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">{flagEmoji(m.team_a_code)} {m.team_a} vs {m.team_b} {flagEmoji(m.team_b_code)}</div>
                  <div className="text-xs text-white/40">{toCT(m.kickoff_time)} CT · {m.round} · <span className={`font-bold ${m.status === 'live' ? 'text-green-400' : m.status === 'finished' ? 'text-white/60' : 'text-yellow-400'}`}>{m.status}</span></div>
                  {m.result && (
                    <div className="text-xs text-green-400 mt-1">
                      Result: {m.result === 'team_a' ? m.team_a : m.result === 'team_b' ? m.team_b : 'Draw'}
                      {m.score_a !== null ? ` (${m.score_a}-${m.score_b})` : ''}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setEditMatch(editMatch === m.id ? null : m.id); setResultForm({ result: m.result || '', scoreA: m.score_a ?? '', scoreB: m.score_b ?? '' }); }}
                  className="btn-secondary text-xs"
                >
                  {editMatch === m.id ? 'Cancel' : 'Set Result'}
                </button>
              </div>
              {editMatch === m.id && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <div className="flex gap-2">
                    <button onClick={() => setResultForm(f => ({ ...f, result: 'team_a' }))}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${resultForm.result === 'team_a' ? 'border-blue-400 bg-blue-500/20 text-blue-200' : 'border-white/20 bg-white/5 text-white/60'}`}>
                      {m.team_a} Wins
                    </button>
                    <button onClick={() => setResultForm(f => ({ ...f, result: 'draw' }))}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${resultForm.result === 'draw' ? 'border-yellow-400 bg-yellow-500/20 text-yellow-200' : 'border-white/20 bg-white/5 text-white/60'}`}>
                      Draw
                    </button>
                    <button onClick={() => setResultForm(f => ({ ...f, result: 'team_b' }))}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${resultForm.result === 'team_b' ? 'border-red-400 bg-red-500/20 text-red-200' : 'border-white/20 bg-white/5 text-white/60'}`}>
                      {m.team_b} Wins
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder={`${m.team_a} score`} value={resultForm.scoreA}
                      onChange={e => setResultForm(f => ({ ...f, scoreA: e.target.value }))}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-sm outline-none" />
                    <span className="text-white/40">-</span>
                    <input type="number" placeholder={`${m.team_b} score`} value={resultForm.scoreB}
                      onChange={e => setResultForm(f => ({ ...f, scoreB: e.target.value }))}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-sm outline-none" />
                    <button onClick={() => handleSetResult(m.id)} className="btn-primary text-xs px-3">Save</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'players' && (
        <div className="card space-y-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 bg-white/5 rounded-xl">
              <span className="font-bold">{p.name}</span>
              <button
                onClick={() => handleRemovePlayer(p.id, p.name)}
                className="text-red-400 hover:text-red-300 text-xs cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
          {players.length === 0 && <div className="text-center text-white/40 py-4">No players</div>}
        </div>
      )}

      {tab === 'audit' && (
        <div className="card space-y-1">
          <h3 className="text-sm font-bold text-white/60 mb-2">Recent Predictions ({audit.length})</h3>
          {audit.slice(0, 100).map(a => (
            <div key={a.id} className="text-xs flex gap-2 py-1 border-b border-white/5">
              <span className="text-white/60 w-32 flex-shrink-0">{new Date(a.recorded_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              <span className="font-bold">{a.player_name}</span>
              <span className="text-white/40">{a.team_a} vs {a.team_b}</span>
              <span className={`font-bold ${a.prediction === 'team_a' ? 'text-blue-400' : a.prediction === 'team_b' ? 'text-red-400' : 'text-yellow-400'}`}>
                {a.prediction === 'team_a' ? a.team_a : a.prediction === 'team_b' ? a.team_b : 'Draw'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
