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
  const [apiUsage, setApiUsage] = useState(null);

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
      const [m, a, p, u] = await Promise.all([
        api.admin.getMatches(pin),
        api.admin.getAudit(pin),
        api.getPlayers(),
        api.admin.getApiUsage(pin),
      ]);
      setMatches(m);
      setAudit(a);
      setPlayers(p);
      setApiUsage(u);
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

  async function handleClearResult(matchId) {
    try {
      await api.admin.clearResult(pin, matchId);
      setMsg('Result cleared');
      setEditMatch(null);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSyncAll() {
    setMsg('');
    setError('');
    try {
      setMsg('Syncing from api-football.com…');
      const res = await api.admin.syncAll(pin);
      if (res.skipped) {
        setMsg(`Sync skipped — daily limit reached (${res.callsToday} calls today)`);
      } else {
        setMsg(`Synced — ${res.groupUpdated} group stage + ${res.knockoutUpdated} knockout matches updated (call ${res.callsToday}/${res.dailyLimit} today)`);
      }
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

  async function handleCleanupPhantom() {
    if (!confirm('Remove fake group stage matches (seed placeholders with no real API data)?')) return;
    try {
      const res = await api.admin.cleanupPhantomMatches(pin);
      setMsg(`Cleaned up ${res.deleted} phantom match${res.deleted !== 1 ? 'es' : ''}. ${res.message || ''}`);
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
    { id: 'api', label: '📡 API' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">⚙️ Admin</h2>
        <div className="flex gap-2">
          <button onClick={handleSyncAll} className="btn-secondary text-xs">🔄 Sync All</button>
          <button onClick={handleCleanupPhantom} className="text-xs bg-orange-500/20 border border-orange-500/40 text-orange-300 px-3 py-1.5 rounded-xl hover:bg-orange-500/30 cursor-pointer">🧹 Fix Matches</button>
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
          {[...matches].sort((a, b) => {
            const order = { live: 0, upcoming: 1, finished: 2 };
            const oa = order[a.status] ?? 1, ob = order[b.status] ?? 1;
            if (oa !== ob) return oa - ob;
            const dir = a.status === 'finished' ? -1 : 1;
            return dir * (new Date(a.kickoff_time) - new Date(b.kickoff_time));
          }).map(m => (
            <div key={m.id} className="card">
              {/* Match header — stacked for mobile */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {/* Teams on one line using codes to save space */}
                  <div className="font-bold text-sm flex items-center gap-1 flex-wrap">
                    <span>{flagEmoji(m.team_a_code)}</span>
                    <span className="truncate max-w-[80px]">{m.team_a}</span>
                    <span className="text-white/40 text-xs">vs</span>
                    <span className="truncate max-w-[80px]">{m.team_b}</span>
                    <span>{flagEmoji(m.team_b_code)}</span>
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {toCT(m.kickoff_time)} CT · {m.round}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-bold ${m.status === 'live' ? 'text-green-400' : m.status === 'finished' ? 'text-white/40' : 'text-yellow-400'}`}>
                      {m.status}
                    </span>
                    {m.result && (
                      <span className="text-xs text-green-400">
                        · {m.result === 'team_a' ? m.team_a_code : m.result === 'team_b' ? m.team_b_code : 'Draw'}
                        {m.score_a !== null ? ` ${m.score_a}–${m.score_b}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setEditMatch(editMatch === m.id ? null : m.id); setResultForm({ result: m.result || '', scoreA: m.score_a ?? '', scoreB: m.score_b ?? '' }); }}
                    className="btn-secondary text-xs py-1.5 px-2"
                  >
                    {editMatch === m.id ? 'Cancel' : m.result ? 'Edit' : 'Set'}
                  </button>
                  {m.result && (
                    <button
                      onClick={() => handleClearResult(m.id)}
                      className="text-xs text-red-400 hover:text-red-300 cursor-pointer text-center py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {editMatch === m.id && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  {/* Win/Draw/Win — flags only to save space */}
                  <div className="flex gap-1.5">
                    <button onClick={() => setResultForm(f => ({ ...f, result: 'team_a' }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex flex-col items-center gap-0.5
                        ${resultForm.result === 'team_a' ? 'border-blue-400 bg-blue-500/20 text-blue-200' : 'border-white/20 bg-white/5 text-white/60'}`}>
                      <span className="text-base">{flagEmoji(m.team_a_code)}</span>
                      <span>Win</span>
                    </button>
                    <button onClick={() => setResultForm(f => ({ ...f, result: 'draw' }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all
                        ${resultForm.result === 'draw' ? 'border-yellow-400 bg-yellow-500/20 text-yellow-200' : 'border-white/20 bg-white/5 text-white/60'}`}>
                      Draw
                    </button>
                    <button onClick={() => setResultForm(f => ({ ...f, result: 'team_b' }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex flex-col items-center gap-0.5
                        ${resultForm.result === 'team_b' ? 'border-red-400 bg-red-500/20 text-red-200' : 'border-white/20 bg-white/5 text-white/60'}`}>
                      <span className="text-base">{flagEmoji(m.team_b_code)}</span>
                      <span>Win</span>
                    </button>
                  </div>
                  {/* Score inputs — numeric keyboard on mobile */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="number" inputMode="numeric" pattern="[0-9]*"
                      placeholder="0" value={resultForm.scoreA}
                      onChange={e => setResultForm(f => ({ ...f, scoreA: e.target.value }))}
                      className="w-16 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-center text-lg font-black outline-none" />
                    <span className="text-white/40 font-bold">–</span>
                    <input
                      type="number" inputMode="numeric" pattern="[0-9]*"
                      placeholder="0" value={resultForm.scoreB}
                      onChange={e => setResultForm(f => ({ ...f, scoreB: e.target.value }))}
                      className="w-16 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-center text-lg font-black outline-none" />
                    <button onClick={() => handleSetResult(m.id)} className="btn-primary text-sm flex-1">
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'players' && (
        <div className="space-y-2">
          <AddPlayerForm adminPin={pin} onDone={() => { setMsg('Player added!'); loadAll(); }} onError={setError} />
          <div className="card space-y-2">
            {players.map(p => (
              <PlayerRow
                key={p.id}
                player={p}
                adminPin={pin}
                matches={matches}
                onRemove={() => handleRemovePlayer(p.id, p.name)}
                onMsg={setMsg}
                onError={setError}
                onPickDone={loadAll}
              />
            ))}
            {players.length === 0 && <div className="text-center text-white/40 py-4">No players yet</div>}
          </div>
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

      {tab === 'api' && (
        <div className="space-y-4">
          {apiUsage ? (
            <>
              {/* api-football.com — primary sync */}
              {apiUsage.apiFootball && (
                <div className="card space-y-3">
                  <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">api-football.com (auto-sync)</h3>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-2xl font-black text-white">{apiUsage.apiFootball.today}</div>
                      <div className="text-xs text-white/40">today</div>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                      <div className={`text-2xl font-black ${apiUsage.apiFootball.remaining < 10 ? 'text-red-400' : apiUsage.apiFootball.remaining < 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {apiUsage.apiFootball.remaining}
                      </div>
                      <div className="text-xs text-white/40">remaining</div>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-2xl font-black text-white/60">{apiUsage.apiFootball.dailyLimit}</div>
                      <div className="text-xs text-white/40">daily limit</div>
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${apiUsage.apiFootball.remaining < 10 ? 'bg-red-400' : apiUsage.apiFootball.remaining < 30 ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(100, (apiUsage.apiFootball.today / apiUsage.apiFootball.dailyLimit) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/30">Auto-syncs every 20 min. Resets daily at midnight UTC.</p>
                </div>
              )}

              {/* Recent API log */}
              <div className="card space-y-1">
                <h4 className="text-xs font-bold text-white/40 uppercase mb-2">Recent calls</h4>
                {apiUsage.recent.map((r, i) => (
                  <div key={i} className="text-xs flex gap-2 py-0.5 border-b border-white/5">
                    <span className="text-white/40 w-28 flex-shrink-0">
                      {new Date(r.called_at + 'Z').toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="text-white/70 flex-1">{r.endpoint}</span>
                    <span className={r.result === 'ok' ? 'text-green-400' : 'text-red-400'}>{r.result}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card text-white/40 text-sm text-center py-4">Loading...</div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player, adminPin, matches, onRemove, onMsg, onError, onPickDone }) {
  const [resetting, setResetting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [playerPreds, setPlayerPreds] = useState({});
  const [newPin, setNewPin] = useState('');

  async function handleResetPin(e) {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) return;
    try {
      await api.admin.resetPlayerPin(adminPin, player.id, newPin);
      onMsg(`PIN reset for ${player.name}`);
      setNewPin('');
      setResetting(false);
    } catch (e) {
      onError(e.message);
    }
  }

  async function openPicking() {
    if (picking) { setPicking(false); return; }
    try {
      const preds = await api.getPredictions(player.id);
      const map = {};
      for (const p of preds) map[p.match_id] = p.prediction;
      setPlayerPreds(map);
      setPicking(true);
    } catch (e) {
      onError(e.message);
    }
  }

  async function handlePick(matchId, prediction) {
    try {
      await api.admin.setPrediction(adminPin, player.id, matchId, prediction);
      setPlayerPreds(prev => ({ ...prev, [matchId]: prediction }));
      onPickDone();
    } catch (e) {
      onError(e.message);
    }
  }

  const pickableMatches = [...matches]
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));

  return (
    <div className="bg-white/5 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold">{player.name}</span>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={openPicking}
            className={`text-xs cursor-pointer ${picking ? 'text-purple-300' : 'text-purple-400 hover:text-purple-300'}`}
          >
            {picking ? 'Done Picking' : 'Pick For'}
          </button>
          <button
            onClick={() => setResetting(r => !r)}
            className="text-xs text-yellow-400 hover:text-yellow-300 cursor-pointer"
          >
            Reset PIN
          </button>
          <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">
            Remove
          </button>
        </div>
      </div>

      {picking && (
        <div className="space-y-2 pt-1">
          {pickableMatches.length === 0 && (
            <p className="text-xs text-white/40 text-center py-2">No upcoming matches to pick.</p>
          )}
          {pickableMatches.map(m => {
            const cur = playerPreds[m.id];
            return (
              <div key={m.id} className={`rounded-xl p-2 space-y-1.5 ${m.status === 'finished' ? 'bg-white/3 opacity-60' : 'bg-white/5'}`}>
                <div className="text-xs text-white/60 flex items-center gap-1.5">
                  {m.status === 'live' && <span className="text-green-400 font-bold animate-pulse">LIVE</span>}
                  {m.status === 'finished' && <span className="text-white/30">FT</span>}
                  {m.team_a} vs {m.team_b} · {toCT(m.kickoff_time)} CT
                </div>
                <div className="flex gap-1">
                  {[
                    { val: 'team_a', label: m.team_a, color: 'blue' },
                    { val: 'draw',   label: 'Draw',   color: 'yellow' },
                    { val: 'team_b', label: m.team_b, color: 'red' },
                  ].map(({ val, label, color }) => (
                    <button
                      key={val}
                      onClick={() => handlePick(m.id, val)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer
                        ${cur === val
                          ? color === 'blue'   ? 'border-blue-400 bg-blue-500/30 text-blue-200'
                          : color === 'yellow' ? 'border-yellow-400 bg-yellow-500/30 text-yellow-200'
                          :                      'border-red-400 bg-red-500/30 text-red-200'
                          : 'border-white/20 bg-white/5 text-white/60 hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resetting && (
        <form onSubmit={handleResetPin} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="New PIN"
            autoFocus
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-sm outline-none focus:border-yellow-400"
          />
          <button type="submit" disabled={newPin.length !== 4} className="btn-primary text-xs px-3 py-1.5">
            Set
          </button>
        </form>
      )}
    </div>
  );
}

function AddPlayerForm({ adminPin, onDone, onError }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || pin.length !== 4) return;
    setSaving(true);
    try {
      await api.admin.createPlayer(adminPin, name.trim(), pin);
      setName('');
      setPin('');
      setOpen(false);
      onDone();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full card text-center text-white/60 hover:text-white hover:bg-white/15 transition-all cursor-pointer border-dashed text-sm py-3"
      >
        + Add Player
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-bold text-white/80">Add Player</h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-400"
        />
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="4-digit PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-400"
          />
          <button
            type="submit"
            disabled={!name.trim() || pin.length !== 4 || saving}
            className="btn-primary text-sm px-4"
          >
            {saving ? '…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setName(''); setPin(''); }}
            className="btn-secondary text-sm px-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
