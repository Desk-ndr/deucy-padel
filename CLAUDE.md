# Deucy Padel — Claude Code Instructions

## First Step
Read `MEMORY.md` in this same folder for full project context, architecture, and design decisions.

## Current State (2026-05-11)

App live at `deucy-padel.vercel.app`. First tournament ran successfully. Save the Date + RSVP flow shipped end-to-end and ready for the May 17 event.

### What's been done:
- Full design system (design-tokens.ts) — dark theme, inline styles only
- All Blitz components rewritten (BlitzList, BlitzSetup, BlitzTimer, BlitzMatchTab, BlitzLeaderboard, BlitzCalendarTab, BlitzBettingCard, BlitzTournament orchestrator)
- Ranking system: schema, service, UI (ATP-style table). **Math: two-month weighted decay** (replaces best-4-of-6 — see MEMORY). H2H rivalry tracking vs adjacent ranked player.
- Auth: phone + PIN login, global identity, access tokens, invite links. **created_by uses stable playerId** (not deviceId, so logout/login keeps host rights).
- UX: tournament end celebration (confetti + trophy), login rebrand, ranking card redesign (stacked leaderboard)
- **Save the Date flow**: status=`announced` with optional scheduled_at + location + location_url. AnnouncedView "event ticket" hero card, single primary CTA, WhatsApp share with pre-filled message, Add to Calendar (platform-aware: iOS .ics / Android Google Cal deep link), location text IS the link (Linear/Notion pattern with superscript ↗).
- **RSVP yes/no**: blitz_rsvps table, anyone logged-in (including host) can confirm/decline, Going list public + Declined list host-only, BlitzSetup pre-fills players from the "yes" list when host opens setup.
- HowItWorks 6.2: worked numerical example (Anna 8-player) + 7 collapsible FAQ. Decay rules section.
- Critical bug fixes: infinite fetch loop (useRef pattern), ranking skeleton stuck, realtime retry logic, multi-actor CAS score submission, announced→setup limbo, phone normalization on insert.

### Pending:
- [ ] End-to-end multi-device test on the actual May 17 tournament
- [ ] Execute `002_main_schema.sql` on Supabase (Andrea manual — for main tournament mode beyond Blitz)
- [ ] Parked: editScore CAS hardening, bonus participation bonus, web push notifications

## Design System Rules (MUST FOLLOW)

- **Inline styles ONLY** — NO Tailwind classes, NO shadcn/ui components
- **Design tokens** from `@/lib/design-tokens` — import `colors`, `spacing`, `radius`, `fonts`, `typeScale`, `shadows`, `animationCSS`
- **Minimum font-size: 14px** for body text. Exception: 10–12px micro labels (uppercase letter-spaced), 11px section headers — used sparingly for hierarchy.
- **No emoji in UI text** (HowItWorks, AnnouncedView, etc.). Exception: WhatsApp share message can use emojis (they live in the external WhatsApp body, not the Deucy UI).
- **All text in English**
- **Dark theme:** bg `#09090B`, surface `#111113`, primary `#22C55E`, accent `#F59E0B`, destructive `#EF4444`
- **Medal colors:** gold `#FFD700`, silver `#C0C0C0`, bronze `#CD7F32`
- **Shared UI components** in `@/components/ui/deucy`: HeroCard, LiveBadge, MonoNumber, TimerRing, DeucyBottomNav
- **Balance in euros** (not cents), `EUROS_PER_GAME = 3`
- **Brand:** "deucy" lowercase sans-serif bold + green dot (Concept E). System font stack (`fonts.brand`). NOT italic Georgia anymore.

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
Tables: `blitz_tournaments`, `blitz_rounds`, `blitz_bets`, `blitz_pledges`, `blitz_rsvps`, `ranking_entries`, `ranking_pledges`, `players`

**blitz_tournaments columns:** id, name, status (`announced|setup|live|finished`), players (jsonb), current_round, total_rounds, round_duration_seconds, schedule (jsonb), timer_started_at, timer_paused_remaining, created_by (playerId), finished_at, scheduled_at, location, location_url, created_at

**Realtime publication** includes: `blitz_tournaments`, `blitz_rounds`, `blitz_bets`, `blitz_rsvps` (all with REPLICA IDENTITY FULL).

**Migrations applied this project:** add_save_the_date_columns, add_blitz_rsvps, add_location_url_to_blitz_tournaments. Schema file `001_blitz_schema.sql` reflects all of them.

## Deploy
- GitHub: `Desk-ndr/deucy-padel` (main branch)
- Vercel: auto-deploy on push to main
- Git push from sandbox: use `osascript do shell script` (sandbox can't push directly)

## Key Technical Patterns
- `useRef(getGlobalPlayer())` + `[]` deps on all useEffects in BlitzList (prevents infinite re-render loop)
- `useBlitzRealtime` has retry logic (3 retries, progressive backoff)
- `animationCSS` from design-tokens injected via `<style>{animationCSS}</style>` in pages that need animations
- Timer is server-side: `timer_started_at` + `timer_paused_remaining` in DB, client calculates from timestamp
- **CAS pattern** for mutations on shared state: UPDATE with `.eq('status', expected)` + `.select()`. Zero rows returned → caller surfaces a soft error (`ALREADY_COMPLETED`, `BET_ALREADY_SETTLED`, `NOT_ANNOUNCED`). Used in submitScore, cancelBet, beginSetup, updateAnnouncement.
- **Stable identity for `created_by`**: tournament ownership uses `playerId` (from `globalPlayer`), NOT `deviceId`. `isCreator` check matches both for legacy compat.
- **Phone normalization at insert time**: every code path that writes to `players.phone` calls `normalizePhone()` first (strips spaces, dashes, parens, dots; keeps leading +). Login `.eq('phone', normalized)` only matches when DB rows are also normalized.
- **Inline-state setup transition**: announced → setup is a LOCAL flag (`setupActive`), not a DB write. Status flips directly `announced → live` when host actually starts. Prevents the "limbo" bug where backing out left a 0-player ghost.
- **Localstorage one-shot handoff** for RSVP → Setup pre-fill: AnnouncedView writes `deucy-prefill-{id}` with the going-list, BlitzSetup reads + clears it on mount.
- **Platform detection** for "Add to Calendar": iOS uses `.ics` data URL, everyone else uses Google Calendar deep link. UA-check inside the component.
- **Two-month decay** in `rankingService.getRanking`: weight 1.0 same calendar month, 0.7 previous, 0 older. `decayWeight(iso, now)` helper.
