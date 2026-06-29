# ⚽ World Cup 2026 Prediction Game

A family prediction game for the 2026 FIFA Men's World Cup. Pick match outcomes before kickoff, rack up points, and win the pot.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)

## Quick Start

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure (optional)
```bash
cp .env.example server/.env
# Add FOOTBALL_DATA_API_KEY for live score sync
```

### 3. Run in development
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### 4. Production build
```bash
npm run build   # builds client into client/dist/
npm start       # serves everything from Express on port 3001
```

## Features

- **Player registration** — up to 8 players, no passwords, just pick your name
- **Match schedule** — full 2026 World Cup schedule (all 104 matches seeded)
- **Predictions** — pick Win/Draw/Win before kickoff; locked at kick-off time
- **Audit trail** — every prediction change stored with UTC timestamp
- **Leaderboard** — live standings, streak tracking, pot value display
- **Reactions** — emoji reactions per match (🎉 😭 🤡 🔥 ...)
- **Admin panel** — at `/admin` (PIN: `2026`) for manual results, audit, player management
- **Live score sync** — polls Football-Data.org every 5 minutes (requires API key)

## Admin Panel
Navigate to `/admin` and enter PIN `2026` (configurable via `ADMIN_PIN` env var).

Admin can:
- Manually set/override match results
- Remove players
- View full prediction audit trail
- Trigger manual API score sync
- Reset the game

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `ADMIN_PIN` | `2026` | Admin panel PIN |
| `FOOTBALL_DATA_API_KEY` | _(none)_ | Free key from football-data.org |

## Match Schedule
The database seeds 104 matches covering:
- Group Stage: 12 groups × 6 matches = 72 matches
- Round of 32: 16 matches
- Round of 16: 8 matches
- Quarterfinals: 4 matches
- Semifinals: 2 matches
- Third Place: 1 match
- Final: 1 match

Knockout round team names update as results are entered in the admin panel.
