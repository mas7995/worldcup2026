const BASE = '/api';

async function request(path, options = {}) {
  const { headers: optHeaders, body: optBody, ...restOptions } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...restOptions,
    headers: { 'Content-Type': 'application/json', ...optHeaders },
    body: optBody ? JSON.stringify(optBody) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getPlayers: () => request('/players'),
  createPlayer: (name, pin) => request('/players', { method: 'POST', body: { name, pin } }),
  verifyPin: (playerId, pin) => request('/players/verify', { method: 'POST', body: { playerId, pin } }),
  setPin: (playerId, currentPin, newPin) =>
    request(`/players/${playerId}/pin`, { method: 'PATCH', body: { currentPin, newPin } }),

  getMatches: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/matches${qs ? '?' + qs : ''}`);
  },
  getMatch: (id) => request(`/matches/${id}`),
  getBracket: () => request('/matches/bracket'),

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
    clearResult: (pin, matchId) =>
      request('/admin/clear-result', { method: 'POST', headers: { 'x-admin-pin': pin }, body: { matchId } }),
    syncAll: (pin) =>
      request('/admin/sync-all', { method: 'POST', headers: { 'x-admin-pin': pin } }),
    syncKnockout: (pin) =>
      request('/admin/sync-knockout', { method: 'POST', headers: { 'x-admin-pin': pin } }),
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
    getApiUsage: (pin) =>
      request('/admin/api-usage', { headers: { 'x-admin-pin': pin } }),
    resetPlayerPin: (adminPin, playerId, newPin) =>
      request(`/admin/players/${playerId}/pin`, {
        method: 'PATCH',
        headers: { 'x-admin-pin': adminPin },
        body: { newPin },
      }),
    createPlayer: (adminPin, name, pin) =>
      request('/admin/players', {
        method: 'POST',
        headers: { 'x-admin-pin': adminPin },
        body: { name, pin },
      }),
    setPrediction: (adminPin, playerId, matchId, prediction) =>
      request('/admin/predictions', {
        method: 'POST',
        headers: { 'x-admin-pin': adminPin },
        body: { playerId, matchId, prediction },
      }),
    updateMatch: (pin, id, data) =>
      request(`/admin/matches/${id}`, {
        method: 'PATCH',
        headers: { 'x-admin-pin': pin },
        body: data,
      }),
  },
};
