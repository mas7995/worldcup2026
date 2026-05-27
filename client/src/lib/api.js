const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getPlayers: () => request('/players'),
  createPlayer: (name) => request('/players', { method: 'POST', body: { name } }),

  getMatches: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/matches${qs ? '?' + qs : ''}`);
  },
  getMatch: (id) => request(`/matches/${id}`),

  getPredictions: (playerId) => request(`/predictions/${playerId}`),
  savePrediction: (playerId, matchId, prediction) =>
    request('/predictions', { method: 'POST', body: { playerId, matchId, prediction } }),

  getLeaderboard: () => request('/leaderboard'),

  getReactions: (matchId) => request(`/reactions/${matchId}`),
  postReaction: (playerId, matchId, emoji) =>
    request('/reactions', { method: 'POST', body: { playerId, matchId, emoji } }),

  admin: {
    setResult: (pin, matchId, result, scoreA, scoreB) =>
      request('/admin/result', {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
        body: { matchId, result, scoreA, scoreB },
      }),
    sync: (pin) =>
      request('/admin/sync', { method: 'POST', headers: { 'x-admin-pin': pin } }),
    getAudit: (pin) =>
      request('/admin/audit', { headers: { 'x-admin-pin': pin } }),
    removePlayer: (pin, id) =>
      request(`/admin/players/${id}`, { method: 'DELETE', headers: { 'x-admin-pin': pin } }),
    reset: (pin) =>
      request('/admin/reset', {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
        body: { confirm: 'RESET_CONFIRMED' },
      }),
    getMatches: (pin) =>
      request('/admin/matches', { headers: { 'x-admin-pin': pin } }),
    updateMatch: (pin, id, data) =>
      request(`/admin/matches/${id}`, {
        method: 'PATCH',
        headers: { 'x-admin-pin': pin },
        body: data,
      }),
  },
};
