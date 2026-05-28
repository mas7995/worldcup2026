// Country code → flag emoji
export function flagEmoji(code) {
  if (!code || code === 'TBD') return '🏴';
  const map = {
    // Americas
    ARG: '🇦🇷', BOL: '🇧🇴', BRA: '🇧🇷', CAN: '🇨🇦', CHI: '🇨🇱',
    COL: '🇨🇴', CRC: '🇨🇷', CUB: '🇨🇺', CUW: '🇨🇼', ECU: '🇪🇨',
    GUA: '🇬🇹', HAI: '🇭🇹', HON: '🇭🇳', JAM: '🇯🇲', MEX: '🇲🇽',
    PAN: '🇵🇦', PAR: '🇵🇾', PER: '🇵🇪', TRI: '🇹🇹', URU: '🇺🇾',
    USA: '🇺🇸', VEN: '🇻🇪',
    // Europe
    AUT: '🇦🇹', BEL: '🇧🇪', CRO: '🇭🇷', CZE: '🇨🇿', DEN: '🇩🇰',
    ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸', FRA: '🇫🇷', GER: '🇩🇪', HUN: '🇭🇺',
    ITA: '🇮🇹', NED: '🇳🇱', NOR: '🇳🇴', POL: '🇵🇱', POR: '🇵🇹',
    ROU: '🇷🇴', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', SRB: '🇷🇸', SVK: '🇸🇰', SVN: '🇸🇮',
    SUI: '🇨🇭', SWE: '🇸🇪', TUR: '🇹🇷', UKR: '🇺🇦', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    // Africa
    ALG: '🇩🇿', CMR: '🇨🇲', CPV: '🇨🇻', CIV: '🇨🇮', EGY: '🇪🇬',
    GHA: '🇬🇭', MAR: '🇲🇦', NGA: '🇳🇬', RSA: '🇿🇦', SEN: '🇸🇳',
    TUN: '🇹🇳',
    // Asia / Pacific
    AUS: '🇦🇺', CHN: '🇨🇳', IDN: '🇮🇩', IRN: '🇮🇷', IRQ: '🇮🇶',
    JPN: '🇯🇵', JOR: '🇯🇴', KOR: '🇰🇷', KSA: '🇸🇦', NZL: '🇳🇿',
    QAT: '🇶🇦', UZB: '🇺🇿',
  };
  return map[code] || '🏴';
}

// Format UTC ISO to Central Time display
export function toCT(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function toCTDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function toCTTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getCountdown(kickoffIso) {
  const diff = new Date(kickoffIso) - Date.now();
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function resultLabel(result, teamA, teamB) {
  if (!result) return '';
  if (result === 'team_a') return teamA;
  if (result === 'team_b') return teamB;
  return 'Draw';
}

export function predLabel(pred, teamA, teamB) {
  if (!pred) return '';
  if (pred === 'team_a') return teamA;
  if (pred === 'team_b') return teamB;
  return 'Draw';
}

export const ROUND_ORDER = [
  'Group A', 'Group B', 'Group C', 'Group D',
  'Group E', 'Group F', 'Group G', 'Group H',
  'Group I', 'Group J', 'Group K', 'Group L',
  'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Third Place', 'Final',
];

export function sortedRounds(matches) {
  const rounds = [...new Set(matches.map(m => m.round))];
  return rounds.sort((a, b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b));
}
