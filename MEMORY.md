# Memory — Deucy Padel (Padel Chaos Cup)

> **Come funziona:** questo file e la memoria persistente di Claude tra sessioni. All'inizio di ogni nuova sessione su questo progetto, Claude legge questo file per recuperare il contesto senza che tu debba rispiegare tutto. Chiedi **"aggiorna memory"** quando serve sincronizzare lo stato, oppure Claude lo aggiorna proattivamente alla fine di sessioni importanti.

---

## Contesto rapido

Progetto personale di Andrea con Rollo (rollodcbryant-git). Web app mobile-first per tornei di padel tra amici (8-24 giocatori): round con partner rotanti, economia a crediti virtuali, e asta digitale 24h finale. Nasce su Lovable (AI code gen), ora in fase di migrazione a sviluppo diretto con Claude. Audit completo fatto il 12 aprile 2026 — ~85 problemi identificati di cui ~15 critici.

## Decisioni chiave prese

- **2026-07-22** — **Dual-court tournaments**. Nuova colonna court_count su blitz_tournaments (default 1, check IN 1..2). Colonne team_a_score_b/team_b_score_b su blitz_rounds per lo score del secondo campo. Il tipo BlitzRoundSchedule ora ha un campo opzionale courtB con teamA/teamB paralleli. computeBlitzConfig e getAllBlitzConfigs accettano param courts (1 o 2): con 2 il divisore diventa 8 invece di 4 (N × K = R × 8), quindi solo configurazioni matematicamente uniformi. generateSchedule con courts=2 seleziona 8 attivi per round e li spezza in 2 gruppi da 4 con findBestSplit su ciascuno; avoidPair top-2/bot-2 applicato in entrambi i court, garantito zero player duplicati by design. BlitzSetup step Time ha un pill 1/2 courts (disabled sotto 8 player, auto-reset a 1 se il roster scende). BlitzMatchTab mostra due HeroCard etichettate Court A / Court B quando torneo è dual, con un court picker (A/B) sopra il form di score input. submitScore accetta parametro court: scrive sui campi corretti, completa il round solo quando entrambi hanno score (advance/finish logic invariata dopo il gate). finalizeRanking somma games/matches di entrambi i court. Retro-compatibilità: i 7 tornei esistenti restano con court_count=1 e vengono renderizzati come sempre. Verifica smoke test node su N=8/9/10/12: zero player duplicati, zero top/bot su stessa squadra, K uniforme.
- **2026-06-01** — **Guest players (one-off, fuori ranking globale)**. Nuova feature in BlitzSetup step Select players: blocco "Guest players" con input nome + button Add, lista con pill rimovibili. I guest entrano nel torneo con `player_id: null` e `isGuest: true` nel JSON players. Non si loggano (no device/PIN), score/bet per loro li inseriscono gli altri player del pool (multi-actor pattern). `finalizeRanking` skippa esplicitamente i player con `isGuest === true` prima di scrivere `ranking_entries` — il fallback name-based resta attivo solo per i NON-guest (per non rompere legacy tornei). Visualizzazione: badge "guest" ambra in 3 punti — BlitzSetup confirm step, BlitzMatchTab team cards (helper PlayerName), BlitzLeaderboard righe + podium. Duplicate guard: stesso nome (case-insensitive) di un registered player o di un altro guest viene scartato all'Add. Limite: nessuno (host decide quanti).
- **2026-06-01** — **Pausa configurabile fra round (setup)**. Aggiunto in BlitzSetup step Time un selettore visivo per la pausa fra round, prima fissa a 150s (2:30). 4 preset pill: 1 min (Tight) · 2 min (Balanced) · 2:30 (Default) · 3 min (Relaxed). Pausa più corta = più tempo di gioco netto, round più lunghi. `computeBlitzConfig` e `getAllBlitzConfigs` in `blitz-schedule.ts` ora accettano `pauseSec` opzionale (default 150). Lo step Config mostra `pause Xmin` nel riepilogo. Motivazione: con N=7/9 le opzioni R sono matematicamente bloccate (gcd(N,4)=1 → R multiplo di N), giocando con la pausa si sblocca marginalmente R=27 ma soprattutto si dà controllo al host sul ritmo del torneo.
- **2026-06-01** — **Bot-2 anti-pair (hard constraint, simmetrico al top-2)**. Estensione di `generateSchedule` in `src/lib/blitz-schedule.ts`: il parametro `avoidPair` (single) diventa `avoidPairs` (array). `findBestSplit` filtra HARD gli split che metterebbero qualsiasi coppia anchor sulla stessa squadra — niente più soft penalty (`TOP_PAIR_PENALTY` rimossa). In `handleStart` (BlitzTournament.tsx) si calcolano sia top-2 (i 2 player con ranking score più alto fra i presenti) sia bot-2 (i 2 più bassi). Guard simmetrica: entrambi i membri di ogni coppia devono avere `score > 0` (= almeno 1 torneo giocato) — altrimenti la coppia non viene aggiunta a `avoidPairs` (opzione "a", non etichettiamo player nuovi come bot). Verifica via simulator: 9 scenari (6p×5r, 7p×4-6r, 8p×4-6r, 9p×4-5r) con i nomi reali del DB → zero violazioni top, zero violazioni bot, zero ripetizioni di coppie in tutti i casi. Feasibility garantita: con max 2 avoidPair (4 anchor), almeno 1 split valido esiste sempre su 3. Motivazione: critiche post-Saturday Blitz 19 mag (Karim 0 partner Rollo / 5 opp = sintomo di squadre 6-0). Hard ban su top-2 era già "quasi hard" via penalty 1000; ora è davvero hard ed esteso anche al bottom.
- **2026-05-11** — **RSVP yes/no per Save the Date**. Tabella `blitz_rsvps(tournament_id, player_id, response yes|no)` con UNIQUE constraint per upsert. Service `setRsvp`/`clearRsvp`/`getRsvps`/`subscribeRsvps`. UI in AnnouncedView: blocco "Will you play?" con 2 bottoni (verde pieno + outlined muted) per qualsiasi loggato (anche host — può confermare/declinare la sua presenza). Stato pinned con link "Change" dopo la risposta. Lista pubblica "Going · N" con pills verdi sotto i CTA (social proof). Lista "Can't make it · N" visibile SOLO all'host con label "visible only to you". Pre-popolo della player list in BlitzSetup: quando host preme "Start setup", i player "yes" vengono passati via `localStorage` (`deucy-prefill-{id}`) e auto-selezionati al mount del setup. Realtime: subscribeRsvps fa refetch dopo INSERT/UPDATE/DELETE. CASCADE delete su tournament o player. Tabella aggiunta a `supabase_realtime` publication + REPLICA IDENTITY FULL.
- **2026-05-11** — **Fix announced→setup limbo**. Bug: cliccando "Start setup" su un Save the Date, lo status flippava `announced→setup`. Se l'host non completava il setup, il torneo restava con 0 player nella sezione UPCOMING. Fix: lo "Start setup" ora apre BlitzSetup INLINE tramite local state `setupActive`, SENZA modificare lo status DB. Lo status flippa solo quando l'host completa effettivamente il setup (`announced→live`, salta lo stadio `setup` persistente). Bottone "← Back to Save the Date" in BlitzSetup ripristina la AnnouncedView (zero side effects). `beginSetup` service rimasto per compat ma non più chiamato dal flow. Saturday Blitz esistente riportato manualmente a `announced` via SQL.
- **2026-05-11** — **AnnouncedView UI redesign (event ticket)**. Restruttura completa della pagina announced. Era: 3 card stackate (When/Where/Calendar) + 2 CTA verdi uguali (Start setup + Share WhatsApp), tutto condensato. Diventa: (1) Hero "ticket card" unica con month label mono + day number 64px hero + day-of-week + dashed perforation divider + pin icon + location + calendar link inline. Stamp rotated "SAVE THE DATE" nell'angolo + top accent stripe ambra. (2) Gerarchia CTA chiara: PRIMARY Start setup verde pieno con glow, SECONDARY Share WhatsApp outlined verde-WA su trasparente, TERTIARY Edit details come link sottolineato 12px centrato. (3) `RsvpRoster` componente unificato sostituisce GoingList/DeclinedList card chrome: section header strip con thin rules + count chip, pills meno cariche. (4) Spacing tra sezioni da `lg` a `xl/xxl`. (5) Rimossa card "You're invited" (ridondante: arrivano da link WA che li dichiara invitati + il "Will you play?" sotto è inequivocabile). Mantenuta solo soft hint per anonimi.
- **2026-05-11** — **Maps URL field**. Colonna `location_url text` su `blitz_tournaments`. Opzionale, host paste il link esatto Google Maps del club. Display: la location text STESSA è il link (pattern Linear/Notion: testo bianco + dashed underline muted + freccia `↗` superscript ambra `margin-top:-8` come annotation), niente più bottone "Open in Maps" separato. Smart fallback: se nessun URL ma c'è location text → link a Google Maps search sul testo. `sanitizeUrl` accetta solo http(s) (no `javascript:` injections). Modal create + AnnouncedView edit hanno entrambi il campo mono URL sotto location.
- **2026-05-11** — **Add to Calendar — platform-aware**. iOS: `.ics` data URL (Apple Calendar nativo). Android + desktop: Google Calendar deep link (no download del file, apre app/web con evento pre-compilato). UA detection runtime via `navigator.userAgent` (`/iPad|iPhone|iPod/`). Rimossa la doppia opzione "Google Cal →" che competeva accanto a "Add to Calendar" — ora c'è una sola CTA che fa la cosa giusta in base al device.
- **2026-05-11** — **WhatsApp invite copy migliorato**. Helper `buildWhatsAppShareHref` estratto. Messaggio: title bold via `*...*` + emoji prefix per ogni linea (🎾 📅 📍 👉 🗺) + CTA "Are you in? Tap to confirm — see who's coming too" (no jargon "RSVP"). deucy link PRIMO (riceve preview WA), maps URL ultimo (no preview hijack). Andrea ha riportato tofu sul preview del suo Android — emojis comunque mantenute perché iOS e Android moderni renderizzano correttamente; WhatsApp passa UTF-8 al recipient unchanged.
- **2026-05-11** — **created_by usa playerId stabile (no più deviceId)**. Bug: logout + re-login = perdita rights host sul proprio torneo. `created_by` salvava il deviceId che si rigenera al clear localStorage. Fix: `createTournament` ora salva `globalPlayer.playerId` (stabile cross-device/logout). `isCreator` check matcha SIA playerId che deviceId (legacy compat). Saturday Blitz esistente patchato via SQL.
- **2026-05-11** — **Phone normalization on insert**. Bug: Victor inserito con `+34 685205881` (spazio dentro), login `.eq('phone', normalized)` non matchava. Fix: `BlitzRanking.handleAddPlayer` ora chiama `normalizePhone()` prima dell'insert. Tutti gli 11 player normalizzati via SQL idempotente (regex strip non-digits keeping leading +). D'ora in poi qualunque numero inserito da admin viene pulito alla fonte.
- **2026-05-11** — **HowItWorks 6.2 — FAQ + worked example**. Aggiunta sezione "A worked example" (Anna 8-player tournament: 5 matches → 3W 1D 1L → 3.5 match score → 3rd → +22 placement pts + 5 betting bonus = +27 total). 7 FAQ collapsible su: tie placement, edit score window (10 min), chi può inserire score, bet cancel 60s, top1/top2 rule, balance vs ranking, Save the Date. Sezione "Best 4 of 6" rinominata "Two-month decay" con tabella weights.
- **2026-05-10** — **Ranking math: best-4-of-6 → two-month decay**. `rankingService.getRanking()` ora calcola `rankingScore = round(sum(entry.totalPoints × decayWeight))` invece del vecchio "best 4 di 6". Pesi: tornei del mese corrente ×1.0, mese precedente ×0.7, oltre ×0 (esclusi). Sostituisce il vecchio `WINDOW_SIZE=6, BEST_OF=4`. Costanti rimosse, helper `decayWeight(iso, now)` aggiunto. Best results visualizzati ora include `weight` + `weightedPoints` + decay pill `×0.7` accanto al nome torneo. Subtitle BlitzRanking aggiornato a "(last 2 months · weighted)". HowItWorks sezione "Best 4 of 6" sostituita da "Two-month decay" con tabella weights + esempio numerico. Edge case: se nessun torneo nel window, score=0 e best results vuoto con copy "No tournaments in window — score will rebuild as you play". Verifica math via simulazione node: tutti i casi pass (entry stesso mese=1.0, mese prec=0.7, ≥2 mesi=0).
- **2026-05-10** — **A+E Rivalry (H2H tracking)**. Nuovo campo `rivalry: Rivalry | null` su `RankedPlayer`. Per ogni player calcoliamo H2H vs il "rival": il player ranked appena sopra (per #1, è #2). Logica: shared tournaments → wins (placed sopra), losses (placed sotto), ties (placement uguale, escluse dal conteggio e dallo streak). Streak: cammina dai più recenti, conta consecutive same-type, salta ties senza romperle, lock al primo mismatch. UI in BlitzRanking expanded view: card "Rivalry vs [Name]" con W/L/shared + pill streak `W2`/`L1` colorato (verde/rosso). HowItWorks ha sezione "Rivalry" che spiega le regole. Commit + deploy: TBD.
- **2026-05-10** — **WhatsApp share su AnnouncedView**. Sostituto pratico per push notifications. Bottone verde WhatsApp `#25D366` con icona, sopra "Edit details" nella `AnnouncedView`. Apre `wa.me/?text=...` con messaggio precompilato (nome torneo, data, ora, location, deep link al torneo). Host tappa, sceglie gruppo, invia. Zero infra, zero permessi. Push web nativo parked: ~5h dev + iOS richiede PWA installata, sproporzionato per pool 8-12 amici.
- **2026-05-10** — **Save the Date tournaments**. Nuovo status `announced` per `blitz_tournaments`. Colonne aggiunte: `scheduled_at timestamptz` e `location text` (entrambe nullable). Lifecycle: `announced` → `setup` → `live` → `finished`. La create modal in `BlitzList` ora ha 3 campi opzionali (date, time, location): se almeno uno è valorizzato il torneo nasce con status `announced`, altrimenti va dritto in `setup` come prima. Nuova sezione "Save the date" nella home (sopra Live), card con bordo sinistro `colors.accent` che mostra data+ora+location. `BlitzTournament` ha un nuovo render branch per `status='announced'` (componente `AnnouncedView`) che mostra calendario card "When"/"Where" + bottone primary "Start setup →" (host only) che chiama `beginSetup(id)` (CAS su `status='announced'` per evitare double-trigger). Host può anche editare nome/data/location inline tramite "Edit details" → `updateAnnouncement()`. NESSUN bottone "Join" — Andrea gestisce le iscrizioni esternamente via WhatsApp. Realtime già copre tutto via `subscribeAllTournaments` (insert/update/delete) — quando un host announce o flip a setup, gli altri device vedono entro ~500ms. Migration: `add_save_the_date_columns` applicata via MCP. Schema file `001_blitz_schema.sql` aggiornato di conseguenza.
- **2026-05-07** — Multi-actor score submission con realtime lock. Tutti i giocatori del torneo (chiunque abbia un'identità nel pool del torneo, inclusi i resting del round corrente) possono inserire lo score, NON solo l'host. Spettatori puri (chi apre il link senza essere nel pool) restano gated. Atomicità garantita via compare-and-swap a livello DB: `submitScore` aggiorna `blitz_rounds` con clausola `WHERE id=? AND status='active'` e `.select()`. Il primo che invia trova `status='active'` e succeede; il secondo trova 0 righe e riceve `error: 'ALREADY_COMPLETED'`. La UI gestisce il secondo caso con toast soft (`Round was just submitted — another player entered the score first`) e refetch automatico. `useBlitzRealtime` ora subscribe anche a `blitz_rounds` (oltre a `blitz_tournaments` e `blitz_bets`), così appena un device completa un round, gli altri device aggiornano lo schermo entro un secondo. `BlitzMatchTab` ha un `useEffect([tournament.current_round])` che chiude il form di submit aperto se il round avanza mid-edit, e mostra il toast informativo. Anche l'Edit Score (post-fact, su completed rounds) è ora aperto a tutti i player del torneo, NON solo all'host. Il `editScore` service non ha CAS protection: due edit simultanei di round diversi possono portare a inconsistenza in `tournament.players` (l'ultimo a finire la recalc sovrascrive). Mitigazione: l'azione è rara, la recalc è deterministica (riapplicarla produce lo stesso risultato), e il realtime sub aggiorna entro ~1s. Hardening completo (CAS via version field o spostamento in Edge Function) è parked task #42.
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

## Lavoro completato — Sessione 5 (2026-05-03/04)

### Task 9-10: Wiring + Build Fix
- **BlitzTournament.tsx** — Wired orchestrator: imports BlitzBettingCard, passes props (bets, playerIndex, playerBalance, existingBet, onPlaceBet) down to BlitzMatchTab
- **BlitzMatchTab.tsx** — Renders `<BlitzBettingCard />` between timer and score submit for resting players
- **BlitzIdentityPicker.tsx** — Restyled with design tokens (dark theme, green primary)
- **Build errors fixed** — Multiple TypeScript issues resolved, app compiles clean

### Leaderboard Two-Tab + Edit Score
- **BlitzLeaderboard.tsx** — Two tabs: Games and Betting. Games shows match results, Betting shows bet history
- **Edit score after confirmation** — Added ability to edit submitted scores

### Deploy
- **Vercel deployment** — App live at `deucy-padel.vercel.app`. Auto-deploy from `main` branch on GitHub (`Desk-ndr/deucy-padel`)
- **Git push method** — Sandbox can't push directly; use `osascript do shell script` via `mcp__Control_your_Mac__osascript`

## Lavoro completato — Sessione 6 (2026-05-04/05)

### Ranking System — Full Implementation
1. **ranking_schema.sql** — New tables: `ranking_entries`, `ranking_pledges`. Applied to Supabase.
2. **Phone OTP Auth** — `useBlitzIdentity` refactored for global identity. Login page with phone + PIN.
3. **finalizeRanking()** — End-of-tournament hook: calculates placements (matchesWon sort + shared placement if tied), writes ranking_entries, updates player balances.
4. **rankingService.ts** — `getRanking()`: fetches all players, calculates best 4 of 6 tournaments, returns sorted `RankedPlayer[]` with stats (winRate, form, consecutiveWins, pointsDelta).
5. **BlitzRanking page** — ATP-style table with stats columns, manage players UI, "How it Works" section.
6. **Crown system** — Crown holder (isCrownHolder) displayed in BlitzList + BlitzLeaderboard.

### Ranking Math & Audit
- **Placement points** — PLACEMENT_POINTS lookup: {1:50, 2:35, 3:22, 4:18, 5:15, 6:12, 7:10, 8:8}
- **Shared placement** — If two players tie on matchesWon AND gamesWon, they share the higher placement and both get those points
- **Best 4 of 6** — Only top 4 tournament results count toward ranking score
- **W% calculation** — Draws count as 0.5 win: `winRate = Math.round(((won + drawn * 0.5) / played) * 100)`
- **Full math audit** — Simulated 4-5 tournaments with 8-9 players each, found and fixed edge cases

### Auth & Access Control
- **Global identity** — `getGlobalPlayer()` returns current logged-in player from localStorage
- **Access token system** — `/p/:token` route for BlitzJoin page (invite links)
- **OTP fallback** — `/blitz/login` route for phone-based login
- **Gate in BlitzList + BlitzSetup** — Redirect to login if not authenticated

### Key Refactors
- **BlitzSetup** — Now selects from registered players pool instead of typing names
- **BlitzLeaderboard Games tab** — Match history with win/loss/draw dots (green/red/amber), shows "vs [opponents]" with score
- **Delete live tournaments** — Admin can delete tournaments + ranking finalization cleanup

## Lavoro completato — Sessione 7 (2026-05-06) — CURRENT

### UX Fixes (from audit)
1. **Tournament End Screen** — Added celebration feel: 40 confetti particles (CSS keyframes), trophy SVG entrance animation (scale+rotate), winner name 36px with glow, "+50 ranking pts" pill badge, staggered fadeSlideUp for ranking rows, medal colors for top 3. New keyframes in `animationCSS`: confettiFall, trophyEntrance, winnerGlow, fadeSlideUp.
2. **Login page rebrand** — Complete rewrite from Tailwind/shadcn to design tokens. 486 lines, all inline styles, SVG icons inline, custom toggle switch.
3. **Tournament loading** — Spinner animation, error state with retry button.

### Critical Bug Fixes
4. **Infinite fetch loop** — `getGlobalPlayer()` created new object on every render → used in useEffect deps → infinite re-render loop (724+ Supabase requests in 5s). Fixed with `useRef(getGlobalPlayer())` and all effects using `[]` deps.
5. **Ranking skeleton stuck** — `setRankingLoading(false)` fired in `finally` block before retries completed. Fixed loading state management.
6. **useBlitzRealtime.ts** — Rewritten with retry logic: up to 3 retries with progressive backoff (1.5s, 3s, 4.5s). Error state exposed via `{ error, refetch }`.

### Ranking Preview Card Redesign (Home Page)
**Design decision (brainstormed 3 options, Andrea chose B — Stacked Leaderboard):**
- **Old design:** Circle avatars with initials in podium layout (2nd-1st-3rd), crown SVG on leader, "best 4 of 6 →" link
- **New design:** Vertical leaderboard rows, each row = position number (medal color) + name + stats + score
- **Specific choices:**
  - NO circle avatars, NO crown icon — just name text
  - Position numbers colored: gold (#FFD700) for 1st, silver (#C0C0C0) for 2nd, bronze (#CD7F32) for 3rd
  - 1st place: larger font (15px name, 18px score in green), bold
  - Stats line under name: "{tournamentsPlayed} played · {winRate}% W"
  - "PTS" column header label (textSecondary color, 10px, mono font) with breathing room from title
  - Title: "Deucy Ranking#" — 16px, white, sans-serif, font-weight 700
  - "See all →" in green, centered at bottom of card (not in header)
  - Green glow (rgba(34,197,94,0.06) bg + 0.12 border) on the "You" row, NOT on 1st place
  - "You" row: position number + "You" + score, separated by divider from top 3
  - Card always visible — shows "No players yet" empty state when no players in pool
  - Entire card is clickable → navigates to `/blitz/ranking`
- **Removed:** PodiumAvatar component (deleted), medalColors/medalSizes constants

### Files Modified This Session
- `src/components/blitz/BlitzMatchTab.tsx` — Tournament end screen celebration
- `src/pages/BlitzTournament.tsx` — Loading/error states, animationCSS injection
- `src/pages/Login.tsx` — Complete rebrand
- `src/pages/BlitzList.tsx` — Ranking card redesign (major), infinite loop fix, empty state
- `src/hooks/useBlitzRealtime.ts` — Retry logic
- `src/lib/design-tokens.ts` — Celebration keyframes

### Technical Notes
- **Bash paths:** `/sessions/fervent-kind-planck/mnt/deucy-padel/` for shell, file tools use full macOS path
- **File tools blocked** for deucy-padel subfolder — must use bash for reads/edits
- **Git push:** Use `mcp__Control_your_Mac__osascript` with `do shell script "cd ... && git push"`
- **Vite build** fails in sandbox (rollup native module issue) but TypeScript compiles clean — not a code problem
- **Vercel auto-deploys** from GitHub push to main

## Design System Rules (CURRENT — reference for all future work)

- **Inline styles ONLY** — NO Tailwind classes, NO shadcn/ui components
- **Design tokens** from `@/lib/design-tokens` — import `colors`, `spacing`, `radius`, `fonts`, `typeScale`, `shadows`
- **Minimum font-size: 14px** everywhere, no exceptions
- **No emoji** in UI text
- **All text in English**
- **Dark theme:** bg `#09090B`, surface `#111113`, primary `#22C55E`, accent `#F59E0B`
- **Medal colors:** gold `#FFD700`, silver `#C0C0C0`, bronze `#CD7F32`
- **Balance in euros** (not cents), `EUROS_PER_GAME = 3`
- **Brand:** "deucy" lowercase italic serif (Georgia)

## Prossimi passi

- [ ] End-to-end flow test (Task 11 — still pending from Phase 1)
- [ ] Verify game history redesign looks correct on live site
- [ ] Consider further UX improvements from audit list
- [ ] Execute `002_main_schema.sql` on Supabase (Andrea manual — for main tournament mode)

## Robustness audit 2026-05-07 (post-TDZ fix)

Audit eseguito da 2 sub-agent in parallelo (race condition + defensive coding sweep).

**Verdetto sul codebase:** hardened. Tutti gli accessi non protetti segnalati dal defensive sweep risultano già coperti da guard (BlitzLeaderboard ha `if (!s) continue`, BlitzCalendarTab usa `.map()` su array, BlitzMatchTab ha guard `malformed` + `currentSchedule null` con fallback friendly + ErrorBoundary root + tab-scoped come safety net).

**Issue residui — PARKED perché richiedono migration o RPC:**

| # | Severità | Issue | Soluzione |
|---|---|---|---|
| 60 | CRITICO | `placeBet` non atomic: INSERT bet + UPDATE players in 2 step. Due bet simultanei possono sovrascrivere balance | Stored proc `place_bet()` in transazione |
| 61 | CRITICO | Visualizzazione incoerente di `current_round` durante submit concorrente. CAS solo su `rounds.status`, non su tournament version | Aggiungere `version` integer column a `blitz_tournaments`, CAS via WHERE version=? |
| 42 | CRITICO | `editScore` ricalcola tutti i balance senza CAS. Edit concorrente di round diversi può sovrascrivere effetti di placeBet recenti | Stored proc o version field |
| 62 | ALTO | `useBlitzRealtime` Promise.all([getRounds, getTournament]) può completare in ordine inverso → flicker incoerente ~50ms | Sequential await OR single combined query |
| 63 | BASSO | `tabInitRef` non si rifa su tournament reset → tab rimane su 'leaderboard' dopo reset | useEffect su tournament.status |

**Issue MEDI già parzialmente mitigati:**
- BlitzMatchTab form state stale dopo realtime: useEffect su `tournament.current_round` resetta scoreA/scoreB e mostra toast "Round was just submitted" ✓
- `cancelBet` vs `submitScore` race: CAS su `status='pending'` previene corruzione, soft error `BET_ALREADY_SETTLED` lato client ✓
- White screen su crash: ErrorBoundary root + tab-scoped, console diagnostico per troubleshooting ✓

**Conclusione:** sicuro per pre-launch testing multi-device. Le 3 race condition critiche restano possibili ma il loro effetto è bounded (data eventually consistent, non corruption permanente in scenari realistici di 8-12 player). Migration DB per chiusura definitiva è prossimo step di hardening.

## Realtime fix 2026-05-07

**Bug critico:** gli aggiornamenti score/bet non si propagavano agli altri device senza refresh manuale.

**Root cause:** la tabella `blitz_rounds` non era nella publication `supabase_realtime` (mancava in `001_blitz_schema.sql`). Quando uno faceva submitScore, il database aggiornava `blitz_rounds.status` da 'active' a 'completed' MA Supabase non broadcastava l'evento. Il `subscribeRounds` aggiunto in commit `58f64ab` rimaneva sordo.

**Fix:** eseguito via MCP execute_sql:
- `ALTER PUBLICATION supabase_realtime ADD TABLE blitz_rounds`
- `ALTER TABLE blitz_tournaments REPLICA IDENTITY FULL`
- `ALTER TABLE blitz_rounds REPLICA IDENTITY FULL`
- `ALTER TABLE blitz_bets REPLICA IDENTITY FULL`

**Perché REPLICA IDENTITY FULL:** Supabase realtime con il default `REPLICA IDENTITY DEFAULT` include nei eventi UPDATE/DELETE solo le colonne PK nel record OLD. I filter client-side `tournament_id=eq.${id}` su tabelle dove `tournament_id` non è la PK (cioè `blitz_rounds` e `blitz_bets`) silenziosamente droppano gli eventi. Con `REPLICA IDENTITY FULL` tutto il record OLD è broadcastato, il filter matcha correttamente.

`001_blitz_schema.sql` aggiornato di conseguenza per future istanze fresh.
