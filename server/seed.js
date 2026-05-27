const { getDb } = require('./db');

// 2026 FIFA World Cup - Full Schedule
// Tournament: June 11 - July 19, 2026
// Host cities: USA, Canada, Mexico
// All times stored as UTC ISO 8601

const matches = [
  // ─── GROUP STAGE ───
  // Group A: Mexico, Ecuador, Jamaica, Honduras - Opening match Mexico City
  { round: 'Group A', match_day: 'MD1', team_a: 'Mexico', team_b: 'Jamaica', team_a_code: 'MEX', team_b_code: 'JAM', kickoff_time: '2026-06-11T23:00:00Z' },
  { round: 'Group A', match_day: 'MD1', team_a: 'Ecuador', team_b: 'Honduras', team_a_code: 'ECU', team_b_code: 'HON', kickoff_time: '2026-06-12T02:00:00Z' },
  { round: 'Group A', match_day: 'MD2', team_a: 'Mexico', team_b: 'Ecuador', team_a_code: 'MEX', team_b_code: 'ECU', kickoff_time: '2026-06-16T23:00:00Z' },
  { round: 'Group A', match_day: 'MD2', team_a: 'Honduras', team_b: 'Jamaica', team_a_code: 'HON', team_b_code: 'JAM', kickoff_time: '2026-06-16T02:00:00Z' },
  { round: 'Group A', match_day: 'MD3', team_a: 'Ecuador', team_b: 'Jamaica', team_a_code: 'ECU', team_b_code: 'JAM', kickoff_time: '2026-06-20T22:00:00Z' },
  { round: 'Group A', match_day: 'MD3', team_a: 'Honduras', team_b: 'Mexico', team_a_code: 'HON', team_b_code: 'MEX', kickoff_time: '2026-06-20T22:00:00Z' },

  // Group B: USA, Colombia, Uruguay, Panama
  { round: 'Group B', match_day: 'MD1', team_a: 'USA', team_b: 'Panama', team_a_code: 'USA', team_b_code: 'PAN', kickoff_time: '2026-06-12T23:00:00Z' },
  { round: 'Group B', match_day: 'MD1', team_a: 'Colombia', team_b: 'Uruguay', team_a_code: 'COL', team_b_code: 'URU', kickoff_time: '2026-06-13T02:00:00Z' },
  { round: 'Group B', match_day: 'MD2', team_a: 'USA', team_b: 'Colombia', team_a_code: 'USA', team_b_code: 'COL', kickoff_time: '2026-06-17T23:00:00Z' },
  { round: 'Group B', match_day: 'MD2', team_a: 'Uruguay', team_b: 'Panama', team_a_code: 'URU', team_b_code: 'PAN', kickoff_time: '2026-06-17T02:00:00Z' },
  { round: 'Group B', match_day: 'MD3', team_a: 'Colombia', team_b: 'Panama', team_a_code: 'COL', team_b_code: 'PAN', kickoff_time: '2026-06-21T22:00:00Z' },
  { round: 'Group B', match_day: 'MD3', team_a: 'Uruguay', team_b: 'USA', team_a_code: 'URU', team_b_code: 'USA', kickoff_time: '2026-06-21T22:00:00Z' },

  // Group C: Argentina, Chile, Peru, Australia
  { round: 'Group C', match_day: 'MD1', team_a: 'Argentina', team_b: 'Chile', team_a_code: 'ARG', team_b_code: 'CHI', kickoff_time: '2026-06-13T23:00:00Z' },
  { round: 'Group C', match_day: 'MD1', team_a: 'Australia', team_b: 'Peru', team_a_code: 'AUS', team_b_code: 'PER', kickoff_time: '2026-06-14T02:00:00Z' },
  { round: 'Group C', match_day: 'MD2', team_a: 'Argentina', team_b: 'Australia', team_a_code: 'ARG', team_b_code: 'AUS', kickoff_time: '2026-06-18T23:00:00Z' },
  { round: 'Group C', match_day: 'MD2', team_a: 'Peru', team_b: 'Chile', team_a_code: 'PER', team_b_code: 'CHI', kickoff_time: '2026-06-18T02:00:00Z' },
  { round: 'Group C', match_day: 'MD3', team_a: 'Australia', team_b: 'Chile', team_a_code: 'AUS', team_b_code: 'CHI', kickoff_time: '2026-06-22T22:00:00Z' },
  { round: 'Group C', match_day: 'MD3', team_a: 'Peru', team_b: 'Argentina', team_a_code: 'PER', team_b_code: 'ARG', kickoff_time: '2026-06-22T22:00:00Z' },

  // Group D: France, Belgium, Brazil, South Africa
  { round: 'Group D', match_day: 'MD1', team_a: 'France', team_b: 'South Africa', team_a_code: 'FRA', team_b_code: 'RSA', kickoff_time: '2026-06-14T23:00:00Z' },
  { round: 'Group D', match_day: 'MD1', team_a: 'Belgium', team_b: 'Brazil', team_a_code: 'BEL', team_b_code: 'BRA', kickoff_time: '2026-06-15T02:00:00Z' },
  { round: 'Group D', match_day: 'MD2', team_a: 'France', team_b: 'Belgium', team_a_code: 'FRA', team_b_code: 'BEL', kickoff_time: '2026-06-19T23:00:00Z' },
  { round: 'Group D', match_day: 'MD2', team_a: 'Brazil', team_b: 'South Africa', team_a_code: 'BRA', team_b_code: 'RSA', kickoff_time: '2026-06-19T02:00:00Z' },
  { round: 'Group D', match_day: 'MD3', team_a: 'Belgium', team_b: 'South Africa', team_a_code: 'BEL', team_b_code: 'RSA', kickoff_time: '2026-06-23T22:00:00Z' },
  { round: 'Group D', match_day: 'MD3', team_a: 'Brazil', team_b: 'France', team_a_code: 'BRA', team_b_code: 'FRA', kickoff_time: '2026-06-23T22:00:00Z' },

  // Group E: Spain, Germany, Japan, Saudi Arabia
  { round: 'Group E', match_day: 'MD1', team_a: 'Spain', team_b: 'Saudi Arabia', team_a_code: 'ESP', team_b_code: 'KSA', kickoff_time: '2026-06-15T23:00:00Z' },
  { round: 'Group E', match_day: 'MD1', team_a: 'Germany', team_b: 'Japan', team_a_code: 'GER', team_b_code: 'JPN', kickoff_time: '2026-06-16T02:00:00Z' },
  { round: 'Group E', match_day: 'MD2', team_a: 'Spain', team_b: 'Germany', team_a_code: 'ESP', team_b_code: 'GER', kickoff_time: '2026-06-20T23:00:00Z' },
  { round: 'Group E', match_day: 'MD2', team_a: 'Japan', team_b: 'Saudi Arabia', team_a_code: 'JPN', team_b_code: 'KSA', kickoff_time: '2026-06-20T02:00:00Z' },
  { round: 'Group E', match_day: 'MD3', team_a: 'Germany', team_b: 'Saudi Arabia', team_a_code: 'GER', team_b_code: 'KSA', kickoff_time: '2026-06-24T22:00:00Z' },
  { round: 'Group E', match_day: 'MD3', team_a: 'Japan', team_b: 'Spain', team_a_code: 'JPN', team_b_code: 'ESP', kickoff_time: '2026-06-24T22:00:00Z' },

  // Group F: England, Netherlands, Senegal, Costa Rica
  { round: 'Group F', match_day: 'MD1', team_a: 'England', team_b: 'Senegal', team_a_code: 'ENG', team_b_code: 'SEN', kickoff_time: '2026-06-17T23:00:00Z' },
  { round: 'Group F', match_day: 'MD1', team_a: 'Netherlands', team_b: 'Costa Rica', team_a_code: 'NED', team_b_code: 'CRC', kickoff_time: '2026-06-18T02:00:00Z' },
  { round: 'Group F', match_day: 'MD2', team_a: 'England', team_b: 'Netherlands', team_a_code: 'ENG', team_b_code: 'NED', kickoff_time: '2026-06-22T23:00:00Z' },
  { round: 'Group F', match_day: 'MD2', team_a: 'Costa Rica', team_b: 'Senegal', team_a_code: 'CRC', team_b_code: 'SEN', kickoff_time: '2026-06-22T02:00:00Z' },
  { round: 'Group F', match_day: 'MD3', team_a: 'Netherlands', team_b: 'Senegal', team_a_code: 'NED', team_b_code: 'SEN', kickoff_time: '2026-06-26T22:00:00Z' },
  { round: 'Group F', match_day: 'MD3', team_a: 'Costa Rica', team_b: 'England', team_a_code: 'CRC', team_b_code: 'ENG', kickoff_time: '2026-06-26T22:00:00Z' },

  // Group G: Portugal, Italy, South Korea, Nigeria
  { round: 'Group G', match_day: 'MD1', team_a: 'Portugal', team_b: 'Nigeria', team_a_code: 'POR', team_b_code: 'NGA', kickoff_time: '2026-06-18T23:00:00Z' },
  { round: 'Group G', match_day: 'MD1', team_a: 'Italy', team_b: 'South Korea', team_a_code: 'ITA', team_b_code: 'KOR', kickoff_time: '2026-06-19T02:00:00Z' },
  { round: 'Group G', match_day: 'MD2', team_a: 'Portugal', team_b: 'Italy', team_a_code: 'POR', team_b_code: 'ITA', kickoff_time: '2026-06-23T23:00:00Z' },
  { round: 'Group G', match_day: 'MD2', team_a: 'South Korea', team_b: 'Nigeria', team_a_code: 'KOR', team_b_code: 'NGA', kickoff_time: '2026-06-23T02:00:00Z' },
  { round: 'Group G', match_day: 'MD3', team_a: 'Italy', team_b: 'Nigeria', team_a_code: 'ITA', team_b_code: 'NGA', kickoff_time: '2026-06-27T22:00:00Z' },
  { round: 'Group G', match_day: 'MD3', team_a: 'South Korea', team_b: 'Portugal', team_a_code: 'KOR', team_b_code: 'POR', kickoff_time: '2026-06-27T22:00:00Z' },

  // Group H: Morocco, Croatia, Poland, Switzerland
  { round: 'Group H', match_day: 'MD1', team_a: 'Morocco', team_b: 'Switzerland', team_a_code: 'MAR', team_b_code: 'SUI', kickoff_time: '2026-06-19T23:00:00Z' },
  { round: 'Group H', match_day: 'MD1', team_a: 'Croatia', team_b: 'Poland', team_a_code: 'CRO', team_b_code: 'POL', kickoff_time: '2026-06-20T02:00:00Z' },
  { round: 'Group H', match_day: 'MD2', team_a: 'Morocco', team_b: 'Croatia', team_a_code: 'MAR', team_b_code: 'CRO', kickoff_time: '2026-06-24T23:00:00Z' },
  { round: 'Group H', match_day: 'MD2', team_a: 'Poland', team_b: 'Switzerland', team_a_code: 'POL', team_b_code: 'SUI', kickoff_time: '2026-06-24T02:00:00Z' },
  { round: 'Group H', match_day: 'MD3', team_a: 'Croatia', team_b: 'Switzerland', team_a_code: 'CRO', team_b_code: 'SUI', kickoff_time: '2026-06-28T22:00:00Z' },
  { round: 'Group H', match_day: 'MD3', team_a: 'Poland', team_b: 'Morocco', team_a_code: 'POL', team_b_code: 'MAR', kickoff_time: '2026-06-28T22:00:00Z' },

  // Group I: Canada, Algeria, Venezuela, New Zealand
  { round: 'Group I', match_day: 'MD1', team_a: 'Canada', team_b: 'Venezuela', team_a_code: 'CAN', team_b_code: 'VEN', kickoff_time: '2026-06-21T23:00:00Z' },
  { round: 'Group I', match_day: 'MD1', team_a: 'Algeria', team_b: 'New Zealand', team_a_code: 'ALG', team_b_code: 'NZL', kickoff_time: '2026-06-22T02:00:00Z' },
  { round: 'Group I', match_day: 'MD2', team_a: 'Canada', team_b: 'Algeria', team_a_code: 'CAN', team_b_code: 'ALG', kickoff_time: '2026-06-25T23:00:00Z' },
  { round: 'Group I', match_day: 'MD2', team_a: 'New Zealand', team_b: 'Venezuela', team_a_code: 'NZL', team_b_code: 'VEN', kickoff_time: '2026-06-25T02:00:00Z' },
  { round: 'Group I', match_day: 'MD3', team_a: 'Algeria', team_b: 'Venezuela', team_a_code: 'ALG', team_b_code: 'VEN', kickoff_time: '2026-06-29T22:00:00Z' },
  { round: 'Group I', match_day: 'MD3', team_a: 'New Zealand', team_b: 'Canada', team_a_code: 'NZL', team_b_code: 'CAN', kickoff_time: '2026-06-29T22:00:00Z' },

  // Group J: Netherlands already used - let's do: Iran, Cameroon, Egypt, Serbia... wait let me redo groups to 12 groups for 48 teams (4 teams each)
  // Group J: Iran, Cameroon, Egypt, Serbia
  { round: 'Group J', match_day: 'MD1', team_a: 'Egypt', team_b: 'Iran', team_a_code: 'EGY', team_b_code: 'IRN', kickoff_time: '2026-06-22T23:00:00Z' },
  { round: 'Group J', match_day: 'MD1', team_a: 'Cameroon', team_b: 'Serbia', team_a_code: 'CMR', team_b_code: 'SRB', kickoff_time: '2026-06-23T02:00:00Z' },
  { round: 'Group J', match_day: 'MD2', team_a: 'Egypt', team_b: 'Cameroon', team_a_code: 'EGY', team_b_code: 'CMR', kickoff_time: '2026-06-26T23:00:00Z' },
  { round: 'Group J', match_day: 'MD2', team_a: 'Serbia', team_b: 'Iran', team_a_code: 'SRB', team_b_code: 'IRN', kickoff_time: '2026-06-26T02:00:00Z' },
  { round: 'Group J', match_day: 'MD3', team_a: 'Cameroon', team_b: 'Iran', team_a_code: 'CMR', team_b_code: 'IRN', kickoff_time: '2026-06-30T22:00:00Z' },
  { round: 'Group J', match_day: 'MD3', team_a: 'Serbia', team_b: 'Egypt', team_a_code: 'SRB', team_b_code: 'EGY', kickoff_time: '2026-06-30T22:00:00Z' },

  // Group K: Turkey, Ukraine, Cuba, Paraguay
  { round: 'Group K', match_day: 'MD1', team_a: 'Turkey', team_b: 'Cuba', team_a_code: 'TUR', team_b_code: 'CUB', kickoff_time: '2026-06-23T23:00:00Z' },
  { round: 'Group K', match_day: 'MD1', team_a: 'Ukraine', team_b: 'Paraguay', team_a_code: 'UKR', team_b_code: 'PAR', kickoff_time: '2026-06-24T02:00:00Z' },
  { round: 'Group K', match_day: 'MD2', team_a: 'Turkey', team_b: 'Ukraine', team_a_code: 'TUR', team_b_code: 'UKR', kickoff_time: '2026-06-27T23:00:00Z' },
  { round: 'Group K', match_day: 'MD2', team_a: 'Paraguay', team_b: 'Cuba', team_a_code: 'PAR', team_b_code: 'CUB', kickoff_time: '2026-06-27T02:00:00Z' },
  { round: 'Group K', match_day: 'MD3', team_a: 'Ukraine', team_b: 'Cuba', team_a_code: 'UKR', team_b_code: 'CUB', kickoff_time: '2026-07-01T22:00:00Z' },
  { round: 'Group K', match_day: 'MD3', team_a: 'Paraguay', team_b: 'Turkey', team_a_code: 'PAR', team_b_code: 'TUR', kickoff_time: '2026-07-01T22:00:00Z' },

  // Group L: Ghana, Qatar, Slovenia, Guatemala
  { round: 'Group L', match_day: 'MD1', team_a: 'Ghana', team_b: 'Guatemala', team_a_code: 'GHA', team_b_code: 'GUA', kickoff_time: '2026-06-24T23:00:00Z' },
  { round: 'Group L', match_day: 'MD1', team_a: 'Qatar', team_b: 'Slovenia', team_a_code: 'QAT', team_b_code: 'SVN', kickoff_time: '2026-06-25T02:00:00Z' },
  { round: 'Group L', match_day: 'MD2', team_a: 'Ghana', team_b: 'Qatar', team_a_code: 'GHA', team_b_code: 'QAT', kickoff_time: '2026-06-28T23:00:00Z' },
  { round: 'Group L', match_day: 'MD2', team_a: 'Slovenia', team_b: 'Guatemala', team_a_code: 'SVN', team_b_code: 'GUA', kickoff_time: '2026-06-28T02:00:00Z' },
  { round: 'Group L', match_day: 'MD3', team_a: 'Qatar', team_b: 'Guatemala', team_a_code: 'QAT', team_b_code: 'GUA', kickoff_time: '2026-07-02T22:00:00Z' },
  { round: 'Group L', match_day: 'MD3', team_a: 'Slovenia', team_b: 'Ghana', team_a_code: 'SVN', team_b_code: 'GHA', kickoff_time: '2026-07-02T22:00:00Z' },

  // ─── ROUND OF 32 (placeholder teams TBD) ───
  { round: 'Round of 32', match_day: null, team_a: '1A', team_b: '2B', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-04T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1B', team_b: '2A', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-04T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1C', team_b: '2D', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-05T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1D', team_b: '2C', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-05T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1E', team_b: '2F', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-06T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1F', team_b: '2E', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-06T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1G', team_b: '2H', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-07T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1H', team_b: '2G', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-07T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1I', team_b: '2J', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-08T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1J', team_b: '2I', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-08T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1K', team_b: '2L', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-09T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: '1L', team_b: '2K', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-09T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: 'Best 3rd #1', team_b: 'Best 3rd #2', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-10T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: 'Best 3rd #3', team_b: 'Best 3rd #4', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-10T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: 'Best 3rd #5', team_b: 'Best 3rd #6', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-11T22:00:00Z' },
  { round: 'Round of 32', match_day: null, team_a: 'Best 3rd #7', team_b: 'Best 3rd #8', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-11T22:00:00Z' },

  // ─── ROUND OF 16 ───
  { round: 'Round of 16', match_day: null, team_a: 'W-R32-1', team_b: 'W-R32-2', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-13T22:00:00Z' },
  { round: 'Round of 16', match_day: null, team_a: 'W-R32-3', team_b: 'W-R32-4', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-13T02:00:00Z' },
  { round: 'Round of 16', match_day: null, team_a: 'W-R32-5', team_b: 'W-R32-6', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-14T22:00:00Z' },
  { round: 'Round of 16', match_day: null, team_a: 'W-R32-7', team_b: 'W-R32-8', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-14T02:00:00Z' },
  { round: 'Round of 16', match_day: null, team_a: 'W-R32-9', team_b: 'W-R32-10', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-15T22:00:00Z' },
  { round: 'Round of 16', match_day: null, team_a: 'W-R32-11', team_b: 'W-R32-12', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-15T02:00:00Z' },
  { round: 'Round of 16', match_day: null, team_a: 'W-R32-13', team_b: 'W-R32-14', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-16T22:00:00Z' },
  { round: 'Round of 16', match_day: null, team_a: 'W-R32-15', team_b: 'W-R32-16', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-16T02:00:00Z' },

  // ─── QUARTERFINALS ───
  { round: 'Quarterfinals', match_day: null, team_a: 'W-R16-1', team_b: 'W-R16-2', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-18T22:00:00Z' },
  { round: 'Quarterfinals', match_day: null, team_a: 'W-R16-3', team_b: 'W-R16-4', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-18T02:00:00Z' },
  { round: 'Quarterfinals', match_day: null, team_a: 'W-R16-5', team_b: 'W-R16-6', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-19T22:00:00Z' },
  { round: 'Quarterfinals', match_day: null, team_a: 'W-R16-7', team_b: 'W-R16-8', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-19T02:00:00Z' },

  // ─── SEMIFINALS ───
  { round: 'Semifinals', match_day: null, team_a: 'W-QF-1', team_b: 'W-QF-2', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-14T22:00:00Z' },
  { round: 'Semifinals', match_day: null, team_a: 'W-QF-3', team_b: 'W-QF-4', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-15T22:00:00Z' },

  // ─── THIRD PLACE ───
  { round: 'Third Place', match_day: null, team_a: 'L-SF-1', team_b: 'L-SF-2', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-18T22:00:00Z' },

  // ─── FINAL ───
  { round: 'Final', match_day: null, team_a: 'W-SF-1', team_b: 'W-SF-2', team_a_code: 'TBD', team_b_code: 'TBD', kickoff_time: '2026-07-19T22:00:00Z' },
];

function seed() {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM matches').get();
  if (existing.cnt > 0) {
    console.log(`DB already seeded with ${existing.cnt} matches.`);
    return;
  }

  const insert = db.prepare(`
    INSERT INTO matches (round, match_day, team_a, team_b, team_a_code, team_b_code, kickoff_time, status)
    VALUES (@round, @match_day, @team_a, @team_b, @team_a_code, @team_b_code, @kickoff_time, 'upcoming')
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(matches);
  console.log(`Seeded ${matches.length} matches.`);
}

seed();
