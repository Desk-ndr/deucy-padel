# Deucy Padel — Claude Code Instructions

## First Step
Read `MEMORY.md` in this same folder for full project context, architecture, and design decisions.

## Current State (2026-05-06)

Tasks 1-10 of the Blitz UI Rebuild are COMPLETE. The app is live at `deucy-padel.vercel.app`.

### What's been done:
- Full design system (design-tokens.ts) — dark theme, inline styles only
- All Blitz components rewritten (BlitzList, BlitzSetup, BlitzTimer, BlitzMatchTab, BlitzLeaderboard, BlitzCalendarTab, BlitzBettingCard, BlitzTournament orchestrator)
- Ranking system: schema, service, UI (ATP-style table), math (best 4 of 6, shared placement, W% with draws)
- Auth: phone + PIN login, global identity, access tokens, invite links
- UX: tournament end celebration (confetti + trophy), login rebrand, ranking card redesign (stacked leaderboard)
- Critical bug fixes: infinite fetch loop (useRef pattern), ranking skeleton stuck, realtime retry logic

### Pending:
- [ ] Task 11: End-to-end flow test (multi-device)
- [ ] Execute `002_main_schema.sql` on Supabase (Andrea manual — for main tournament mode)

## Design System Rules (MUST FOLLOW)

- **Inline styles ONLY** — NO Tailwind classes, NO shadcn/ui components
- **Design tokens** from `@/lib/design-tokens` — import `colors`, `spacing`, `radius`, `fonts`, `typeScale`, `shadows`
- **Minimum font-size: 14px** everywhere, no exceptions
- **No emoji** in UI text
- **All text in English**
- **Dark theme:** bg `#09090B`, surface `#111113`, primary `#22C55E`, accent `#F59E0B`
- **Medal colors:** gold `#FFD700`, silver `#C0C0C0`, bronze `#CD7F32`
- **Shared UI components** in `@/components/ui/deucy`: HeroCard, LiveBadge, MonoNumber, TimerRing, DeucyBottomNav
- **Balance in euros** (not cents), `EUROS_PER_GAME = 3`
- **Brand:** "deucy" lowercase italic serif (Georgia)

## Ranking Card Design (Home Page — BlitzList.tsx)
- Stacked leaderboard rows (no avatars, no crown)
- Position numbers colored by medal (gold/silver/bronze)
- Stats: "{tournamentsPlayed} played · {winRate}% W"
- Title: "Deucy Ranking#" (16px, white, bold)
- "See all →" centered at bottom in green
- Green glow on "You" row (not 1st place)
- Always visible — empty state "No players yet" when pool is empty

## Stack
React 18 + TypeScript + Vite + Supabase (realtime enabled)

## Supabase
Instance: `mnquuqskpfmzcmirrwef.supabase.co`
Schema: `001_blitz_schema.sql` (applied) + ranking tables
Tables: `blitz_tournaments`, `blitz_rounds`, `blitz_bets`, `blitz_pledges`, `ranking_entries`, `ranking_pledges`

## Deploy
- GitHub: `Desk-ndr/deucy-padel` (main branch)
- Vercel: auto-deploy on push to main
- Git push from sandbox: use `osascript do shell script` (sandbox can't push directly)

## Key Technical Patterns
- `useRef(getGlobalPlayer())` + `[]` deps on all useEffects in BlitzList (prevents infinite re-render loop)
- `useBlitzRealtime` has retry logic (3 retries, progressive backoff)
- `animationCSS` from design-tokens injected via `<style>{animationCSS}</style>` in pages that need animations
- Timer is server-side: `timer_started_at` + `timer_paused_remaining` in DB, client calculates from timestamp
