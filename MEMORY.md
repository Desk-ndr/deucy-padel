# Memory — Deucy Padel (Padel Chaos Cup)

> **Come funziona:** questo file e la memoria persistente di Claude tra sessioni. All'inizio di ogni nuova sessione su questo progetto, Claude legge questo file per recuperare il contesto senza che tu debba rispiegare tutto. Chiedi **"aggiorna memory"** quando serve sincronizzare lo stato, oppure Claude lo aggiorna proattivamente alla fine di sessioni importanti.

---

## Contesto rapido

Progetto personale di Andrea con Rollo (rollodcbryant-git). Web app mobile-first per tornei di padel tra amici (8-24 giocatori): round con partner rotanti, economia a crediti virtuali, e asta digitale 24h finale. Nasce su Lovable (AI code gen), ora in fase di migrazione a sviluppo diretto con Claude. Audit completo fatto il 12 aprile 2026 — ~85 problemi identificati di cui ~15 critici.

## Decisioni chiave prese

- **2026-04-12** — Stack confermato: React 18 + TypeScript + Vite + Supabase + shadcn/ui + Tailwind CSS. Non si cambia stack.
- **2026-04-12** — Si continua dal codice Lovable esistente con refactor mirato. NON si rifà da zero.
- **2026-04-12** — Nuova istanza Supabase separata per la versione refactored. Il Supabase di Lovable NON si tocca.
- **2026-04-12** — Economia crediti: stake progressivo per round (moltiplicatore x1, x1.5, x2) invece di stake fisso. Da calibrare sui numeri.
- **2026-04-12** — Match confirmation: conferma dell'avversario obbligatoria, auto-approve dopo 12h se nessuno contesta.
- **2026-04-12** — Notifiche: testo pre-generato per WhatsApp (copia-incolla), zero infrastruttura push/SMS.
- **2026-04-12** — Scope: full build (non MVP ridotto), ma con priorita intelligenti.

## Scelte tecniche

- **Stack principale:** React 18 + TypeScript + Vite 5.4 + Supabase JS 2.95
- **UI:** shadcn/ui (Radix primitives) + Tailwind CSS 3.4 (dark theme)
- **State management:** TanStack React Query 5.83 + React Context (PlayerContext)
- **Forms:** React Hook Form 7.61 + Zod 3.25
- **Routing:** React Router 6.30
- **Charts:** Recharts 2.15
- **Auth:** Custom phone + 4-digit PIN (NOT Supabase Auth per i player, Supabase Auth solo per admin)
- **Crediti:** Stored as cents (integer). 2000 = 20.00 EUR. Funzione `formatEuros()` in `lib/euros.ts`.
- **Realtime:** Supabase Realtime abilitato su `auction_lots` e `bids`.
- **Storage:** Buckets `avatars` e `pledge-images` (public).
- **Edge Functions:** `tournament-engine` (pairing, round management, credit calculations).

## Architettura DB (schema consolidato)

### Tabelle principali
| Tabella | Righe tipo | Note |
|---|---|---|
| `tournaments` | Config torneo + settings economia + betting settings | Include tier (Major/League/Mini) |
| `players` | Profilo + stats + crediti + sessione | `tournament_id` nullable (account-only possible) |
| `rounds` | Round torneo + playoff flag | `is_playoff` + `playoff_type` (semi/final) |
| `matches` | Match 2v2 + risultato + deadline | Include bye flag + booking claim |
| `credit_ledger_entries` | Ogni movimento crediti | Audit trail completo |
| `pledge_items` | Pledge per l'asta | Per round, con approvazione admin |
| `auctions` | Config asta | 1:1 con tournament, anti-sniping flag |
| `auction_lots` | Lotto in asta | 1:1 con pledge_item |
| `bids` | Offerte su lotti | Linked a lot + player |
| `escrow_holds` | Crediti riservati | Active/Released/Settled |
| `notifications` | Notifiche in-app | Non implementate lato frontend |
| `user_roles` | Ruoli admin | Linked a Supabase Auth users |
| `match_bets` | Scommesse su match | Sistema betting separato |
| `waitlist_entries` | Lista d'attesa | Con priorita e inviti |
| `blitz_tournaments` | Tornei blitz (formato diverso) | JSON-based players e schedule |
| `blitz_rounds` | Round blitz | |
| `blitz_bets` | Scommesse blitz | |

### Enums
`tournament_status`: Draft, SignupOpen, Live, Finished, AuctionLive, Closed
`player_status`: Active, InactiveWarning, Removed
`match_status`: Scheduled, BookingClaimed, Played, Overdue, AutoResolved
`credit_type`: StartingGrant, ParticipationBonus, MatchStake, MatchPayout, Penalty, AdminAdjustment, AuctionHold, AuctionRelease, AuctionSettlement
`pledge_status`: Draft, Approved, Hidden
`auction_status`: Draft, Live, Ended
`escrow_status`: Active, Released, Settled

## Direzione design

- **Tone of voice:** Playful, witty, lightly roast-y, not cringe. "Scores locked. Friendships pending."
- **Visual:** Dark & bold, dark backgrounds, vibrant accents
- **Typography:** System defaults (shadcn)
- **Layout:** Mobile-first, large touch targets, one CTA per screen, status chips, countdown timers
- **Reference:** Catawiki (per l'asta), sportive apps (per match/leaderboard)

## Problemi critici identificati (audit 2026-04-12)

### Rotto / Non funziona
1. Credenziali admin hardcoded in `AdminLogin.tsx` (`admin@deucy.app` / `admin-deucy-2024`, passcode `1111`)
2. Anti-sniping: UI decorativa, nessun codice estende il timer
3. Escrow: race conditions — bid non atomiche, settlement mancante
4. Creazione lotti automatica: non esiste codice che crea AuctionLot da pledge approvati
5. Bottone "Conferma Finalisti" in `AdminFinalsSection.tsx`: mostra toast ma non fa nulla
6. Bug booleano in `Pledges.tsx` e `PledgeDetail.tsx`: `status === 'AuctionLive' || 'Finished'` sempre true
7. Match result: no lock, no conferma avversario, ultimo che scrive vince

### Sicurezza
8. Zero route protection — tutte le pagine accessibili senza login
9. PIN hashing debole (client-side, no salt, 10k combinazioni)
10. RLS troppo permissive ("Anyone can update/insert" su tabelle critiche)
11. Upload file senza validazione MIME type
12. PIN salvabile in localStorage

### Feature mancanti
13. Conferma match dall'avversario + auto-approve 12h
14. Notifiche/nudge (neanche testo pre-generato WhatsApp)
15. Stake progressivo per round
16. Export risultati per WhatsApp
17. Gestione bye UX
18. Pairing algorithm: feedback assente per admin

### Qualita codice
19. Nessun service layer — Supabase chiamato direttamente in ogni componente
20. `BlitzTournament.tsx` = 897 righe (da splittare in 4+)
21. Loading/error/empty states inconsistenti
22. Valori hardcoded ovunque (URL club, bet max, payout)
23. Draft pledge visibili a tutti (bug privacy)
24. Timezone non gestite nel CountdownTimer
25. Nessun test

## Punti aperti / Questioni irrisolte

- [ ] Calibrazione esatta dello stake progressivo (moltiplicatori per round)
- [ ] Edge functions: vanno riscritte o possiamo riusarle?
- [ ] Design: rifiniamo il visual o funzionalita first?
- [ ] Verificare che l'app compili (`npm run dev`) e si connetta al nuovo Supabase
- [ ] Testare flusso Blitz end-to-end multi-device

## Lavoro completato — Sessione 2 (2026-04-13)

### Blitz Multi-Device Refactor
Refactor completo del Blitz Tournament da single-device (un telefono passato tra giocatori) a multi-device (ognuno dal proprio telefono via link condiviso). Architettura creatore/spettatore con sync Realtime.

**Infrastruttura:**
1. **Nuovo Supabase** — Creata istanza separata (`mnquuqskpfmzcmirrwef.supabase.co`). `.env.local` punta qui, `.env` mantiene credenziali Lovable.
2. **001_blitz_schema.sql** — Schema completo: 4 tabelle (blitz_tournaments con timer server-side, blitz_rounds, blitz_bets, blitz_pledges), indici, RLS permissive, Realtime su tournaments+bets.

**Service Layer & Hooks:**
3. **blitzService.ts** (237 righe) — 15 funzioni: CRUD tornei, timer (start/pause/reset), submitScore (round completion + balance + bet settlement + advancement), placeBet, resetTournament.
4. **useBlitzRealtime.ts** (41 righe) — Fetch + subscribe a postgres_changes su blitz_tournaments e blitz_bets. Auto-refetch su update.
5. **useBlitzIdentity.ts** (38 righe) — Device ID via `crypto.randomUUID()` in localStorage. Player identity per torneo. `isCreator` confronta deviceId con `tournament.created_by`.
6. **useBlitzTimer.ts** (53 righe) — Timer server-side calcolato da `timer_started_at` (timestamptz). `requestAnimationFrame` per aggiornamenti smooth (250ms). Tre stati: running/paused/not started.

**Componenti (da monolite 897 righe a 14 file):**
7. **BlitzIdentityPicker.tsx** (38 righe) — Overlay "Who are you?" con selezione giocatore.
8. **BlitzTimer.tsx** (67 righe) — Countdown monospace, pulse rosso ≤60s, controlli solo per creator.
9. **BlitzSetup.tsx** (141 righe) — Wizard 4 step: player count → time → config → nomi.
10. **BlitzMatchTab.tsx** (149 righe) — Match corrente, team A vs B, resting players, score input (creator only).
11. **BlitzBetsTab.tsx** (181 righe) — Form scommessa, storico, accuratezza per giocatore. Solo resting players possono scommettere.
12. **BlitzCalendarTab.tsx** (58 righe) — Calendario partite con indicatore live.
13. **BlitzLeaderboard.tsx** (119 righe) — Classifica espandibile con ledger transazioni per giocatore.
14. **BlitzTournament.tsx** (168 righe) — Orchestratore puro: 3 hooks, handler sottili, zero chiamate Supabase dirette.
15. **BlitzList.tsx** (125 righe) — Migrato a service layer.

### Decisioni architetturali Sessione 2
- **Timer server-side:** `timer_started_at` + `timer_paused_remaining` nel DB. Client calcola countdown da timestamp server → zero drift, funziona in background, sync automatico tra device.
- **Device ID:** `crypto.randomUUID()` in localStorage (`blitz-device-id`). Il creatore del torneo salva il suo deviceId in `tournament.created_by`. Scalabile per futuro uso pubblico.
- **Player identity per torneo:** localStorage key `blitz-identity-${tournamentId}` per associare device a giocatore.
- **Trust-based RLS:** Policies permissive per ora (tutti possono leggere/scrivere). Da restringere quando si va in produzione pubblica.
- **Join via link:** Condivisione URL del torneo. Chiunque con il link puo unirsi e identificarsi.

## Lavoro completato — Sessione 1 (2026-04-12/13)

### Batch 1: Security & Auth
1. **AdminLogin.tsx** — rimosso hardcoded `admin@deucy.app` / `admin-deucy-2024` / passcode `1111`. Ora usa solo Supabase Auth + verifica ruolo admin da `user_roles`.
2. **AdminDashboard.tsx** — rimosso check localStorage passcode.
3. **ProtectedRoute.tsx** — NUOVO. Wrapper per route player con `usePlayer()` hook.
4. **ProtectedAdminRoute.tsx** — NUOVO. Wrapper per route admin con Supabase auth + role check.
5. **App.tsx** — ristrutturato router con layout routes: pubbliche / player (protette) / admin (protette).

### Batch 2: Service Layer + Bug Fixes
6. **tournamentService.ts** — NUOVO. getTournament, joinTournament, confirmParticipation, etc.
7. **matchService.ts** — NUOVO. getMatchesByRound, claimBooking, reportResult, getRounds, getLiveRound.
8. **creditService.ts** — NUOVO. getPlayerBalance, getLedgerEntries, getLeaderboard.
9. **auctionService.ts** — NUOVO. getAuction, getAuctionLots, getBidsForLot, submitPledge, updatePledge.
10. **playerService.ts** — NUOVO. getPlayer, updateProfile, uploadAvatar, getPlayerStats.
11. **services/index.ts** — NUOVO. Re-export barrel file.
12. **Landing.tsx** — fix credits display: `tournament.starting_credits` (2000) → `formatEuros()` (€20.00).
13. **AuctionHouse.tsx** — fix Draft pledge visibili a tutti → solo al owner.
14. **useRoundPledges.ts** — aggiunto `currentPlayerId` param per filtrare Draft.

### Batch 3: UI + Match Flow + Migrations
15. **MatchCard.tsx** — aggiunto stato PendingConfirmation + Disputed con UI appropriata.
16. **ReportResultDialog.tsx** — toast in italiano.
17. **BottomNav.tsx** — nascosta su route pubbliche/admin via `HIDDEN_ROUTES` Set.
18. **LoadingState.tsx, ErrorState.tsx, EmptyState.tsx** — NUOVI componenti UI riusabili.
19. **Matches.tsx** — migrato a service layer, status PendingConfirmation.
20. **Leaderboard.tsx** — migrato a service layer + nuovi UI components.
21. **PlayerProfile.tsx** — migrato a service layer.
22. **Tournaments.tsx** — migrato + join validation (status + max_players).
23. **AdminFinalsSection.tsx** — riscritto: crea round semifinale reale con seeding #1+#4 vs #2+#3.
24. **types.ts** — aggiunto PendingConfirmation, Disputed a MatchStatus, nuovi campi Match.

## Ultime attivita (ordine inverso)

- **2026-04-20** — Sessione 3: Schema torneo principale consolidato (`002_main_schema.sql`, 550 righe, 14 tabelle + 14 enum + indici + RLS + storage). Fix bug `credit_ledger` → `credit_ledger_entries` in creditService.ts, `player-avatars` → `avatars` in playerService.ts, campi mancanti in types.ts. Prompt per Lovable: fix betting (€10 iniziali), round picker, dual slider config, timer sync server-side.
- **2026-04-13** — Sessione 2: Blitz multi-device refactor completo. 15 file nuovi/riscritti. Nuovo Supabase attivo. Schema DB migrato. App compila e gira su localhost:8080. Fix batch di `\!` escape da bash.
- **2026-04-13** — Consolidamento cartelle: file orfani in Lavoro copiati nel progetto principale, cartelle orfane rimosse.
- **2026-04-12/13** — Sessione 1 di sviluppo: 24 task completati (auth, service layer, bug fixes, UI, page migrations). Vedi lista sopra.
- **2026-04-12** — Audit completo del codebase (4 agenti paralleli). 85+ problemi identificati. Documentazione progetto creata.
- **2026-04-12** — Prima sessione Claude su questo progetto. Analisi repo GitHub, connessione cartella locale, review architettura e data model.
- **2026-02-05 → 2026-04-10** — Sviluppo su Lovable con Rollo. 20 migrazioni DB, 35 pagine, features varie implementate con qualita mista.

## Prossimo passo concreto

1. ~~Verificare che l'app compili e si connetta al nuovo Supabase~~ ✅ Compila, visibile su localhost:8080.
2. Test end-to-end del flusso Blitz multi-device (creare torneo → join da altro device → timer → score → leaderboard).
3. ~~Creare schema DB completo per il torneo principale~~ ✅ `002_main_schema.sql` (550 righe) — da eseguire su SQL Editor.
4. **Eseguire `002_main_schema.sql` sul nuovo Supabase** (Andrea via SQL Editor).
5. Continuare con Sprint 1b (PIN hashing, rate limiting, RLS) e Sprint 2 (Auction & Economy).

## Blocchi / Dipendenze

- **Nuovo Supabase attivo** (`mnquuqskpfmzcmirrwef.supabase.co`) — schema Blitz migrato, env vars configurate.
- **App compila** — `npm run dev` funziona, preview su `localhost:8080`.
- **Bloccante per torneo principale:** schema DB consolidato ancora da creare sul nuovo Supabase.
- **Nota tecnica:** i file creati via bash `cat` escapano i `!` con `\!`. Fixato in Sessione 2, da ricordare per file futuri.

## Riferimenti utili

- Repo: https://github.com/rollodcbryant-git/deucy-padel
- Lovable plan originale: `.lovable/plan.md`
- Schema DB iniziale: `supabase/migrations/20260205203334_*.sql`
- Tipi TypeScript: `src/lib/types.ts`
- Supabase generated types: `src/integrations/supabase/types.ts`

## Lavoro completato — Sessione 4 (2026-05-01)

### Blitz UI Rebuild — Fase 1 completa

**Design System v3:**
1. **design-tokens.ts** — Dark theme (#09090B bg), green primary (#22C55E), amber accent (#F59E0B). Flat tokens: colors, spacing, radius, fonts, typeScale, shadows. Minimum fontSize: 14px everywhere.
2. **Shared UI (deucy/)** — HeroCard, LiveBadge, MonoNumber, TimerRing, DeucyBottomNav. Brand: "deucy" lowercase italic serif (Georgia).

**Rewritten Components (Tasks 1-8):**
3. **BlitzList.tsx** — Home screen, tournament cards, create/join.
4. **BlitzSetup.tsx** — 4-step wizard: player count, time, config, names.
5. **BlitzTimer.tsx** — Server-side timer, TimerRing, pulse red ≤60s, creator controls.
6. **BlitzMatchTab.tsx** — Teams card, resting indicator, timer, score input, completed rounds.
7. **BlitzLeaderboard.tsx** — Podium (gold/silver/bronze), expandable table with transaction ledger.
8. **BlitzCalendarTab.tsx** — Segmented progress bar, expandable round cards, LiveBadge.
9. **BlitzBettingCard.tsx** — NEW. Prediction Card for resting players. Team selector (A/B glow+checkmark), stake presets (€1/€3/€5/All-in), sentiment bar (green/amber), already-bet state with pulsing indicator.

**Preview:**
10. **deucy-preview-v3.jsx** — Interactive prototype with all 5 screens (Home, Match+Betting, Standings, Schedule). 815 lines.

**Key rules:**
- Inline styles only, NO Tailwind, NO shadcn/ui
- Design tokens from `@/lib/design-tokens`
- Minimum font-size: 14px (51 occurrences fixed across 9 files)
- Medal colors: gold (#FFD700), silver (#C0C0C0), bronze (#CD7F32)
- Balance in euros (not cents), EUROS_PER_GAME = 3

### Pending for Claude Code (Tasks 9-10)
- **Task 9:** BlitzIdentityPicker + BlitzTournament orchestrator — wire all components together
- **Task 10:** End-to-end test — npm run dev, multi-device flow
- **Still pending:** Execute 002_main_schema.sql on Supabase (Andrea manual)
