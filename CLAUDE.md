# Deucy Padel — Claude Code Instructions

## First Step
Read `MEMORY.md` in this same folder for full project context, architecture, and design decisions.

## Current Sprint: Blitz UI Rebuild — Tasks 9-10

### Task 9: Wire BlitzTournament Orchestrator + BlitzBettingCard

**Goal:** Connect all the new UI components together so the Blitz tournament flow works end-to-end.

**Files to modify:**
- `src/components/blitz/BlitzTournament.tsx` — Main orchestrator (168 lines). Import and render `BlitzBettingCard` inside the match view for resting players.
- `src/components/blitz/BlitzIdentityPicker.tsx` — Update to use design tokens from `@/lib/design-tokens` (inline styles, NO Tailwind, NO shadcn/ui).

**New component to integrate:**
- `src/components/blitz/BlitzBettingCard.tsx` — Already built (264 lines). Props:
  ```typescript
  interface BlitzBettingCardProps {
    tournament: BlitzTournamentData;
    currentSchedule: BlitzRoundSchedule;
    playerIndex: number;
    playerBalance: number;
    existingBet: BlitzBet | null;
    bets: BlitzBet[];
    onPlaceBet: (prediction: 'A' | 'B', stake: number) => Promise<void>;
  }
  ```
  - The component self-guards: only renders if `playerIndex` is in `currentSchedule.rest`
  - Place it in BlitzMatchTab between the timer and the "Submit Score" button
  - `onPlaceBet` should call `blitzService.placeBet()` with updated player balances (stake deducted)

**Integration checklist:**
1. BlitzTournament passes `bets`, `playerIndex`, `playerBalance`, `existingBet`, `onPlaceBet` down to BlitzMatchTab
2. BlitzMatchTab renders `<BlitzBettingCard />` between timer and score submit
3. `onPlaceBet` handler: deduct stake from player balance, call `placeBet(tournamentId, roundIndex, bettorIndex, prediction, stake, updatedPlayers)`
4. BlitzIdentityPicker restyled with design tokens (dark theme, green primary)

**Key hooks already available:**
- `useBlitzIdentity(tournamentId)` → `{ playerIndex, playerName, isCreator, deviceId, pickPlayer, clearIdentity }`
- `useBlitzRealtime(tournamentId)` → `{ tournament, rounds, bets, loading, error }`
- `useBlitzTimer(tournament)` → `{ secondsLeft, isRunning, isPaused, isExpired }`

### Task 10: End-to-End Test

**Goal:** Verify the full Blitz flow works.

1. `npm run dev` — app should compile without errors on `localhost:8080`
2. Create a tournament (5 players, 8 min rounds)
3. Open in a second tab, join as different player
4. Start tournament, verify timer syncs
5. As resting player, place a prediction via BettingCard
6. Submit score, verify balances update and bet settles
7. Verify leaderboard and calendar reflect results

## Design System Rules (MUST FOLLOW)

- **Inline styles ONLY** — NO Tailwind classes, NO shadcn/ui components
- **Design tokens** from `@/lib/design-tokens` — import `colors`, `spacing`, `radius`, `fonts`, `typeScale`, `shadows`
- **Minimum font-size: 14px** everywhere, no exceptions
- **No emoji** in UI text
- **All text in English**
- **Dark theme:** bg `#09090B`, surface `#111113`, primary `#22C55E`, accent `#F59E0B`
- **Shared UI components** in `@/components/ui/deucy`: HeroCard, LiveBadge, MonoNumber, TimerRing, DeucyBottomNav
- **Balance in euros** (not cents), `EUROS_PER_GAME = 3`

## Stack
React 18 + TypeScript + Vite + Supabase (realtime enabled)

## Supabase
Instance: `mnquuqskpfmzcmirrwef.supabase.co`
Schema: `001_blitz_schema.sql` (already applied)
Tables: `blitz_tournaments`, `blitz_rounds`, `blitz_bets`, `blitz_pledges`
