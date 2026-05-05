# TODO — Deucy Padel (Padel Chaos Cup)

> **Convenzione priorita:** CRITICO / ALTO / MEDIO / BASSO
> **Regola:** Ogni sprint ha max 5-7 task. Si completa uno sprint prima di iniziare il successivo.
> **Ultimo aggiornamento:** 2026-04-13 (post-sessione 2)

---

## PREREQUISITO — Nuovo Supabase

- [x] CRITICO — Creare nuova istanza Supabase (separata da Lovable) ✅ Sessione 2 — `mnquuqskpfmzcmirrwef.supabase.co`
- [x] CRITICO — Migrazione schema Blitz (001_blitz_schema.sql eseguita su SQL Editor) ✅ Sessione 2
- [x] CRITICO — Configurare env vars nel progetto locale (.env.local con nuove credenziali) ✅ Sessione 2
- [x] CRITICO — Migrazione schema torneo principale (002_main_schema.sql, 550 righe) ✅ Sessione 3 — file creato, da eseguire su SQL Editor
- [x] ALTO — Test: verificare che l'app si connette al nuovo Supabase e funziona (`npm run dev`) ✅ Sessione 2
- [ ] ALTO — Eseguire 002_main_schema.sql sul nuovo Supabase (Andrea via SQL Editor)

> Il Supabase di Lovable NON si tocca. Il nuovo Supabase ha schema Blitz + file torneo principale pronto da eseguire.

---

## Sprint 1 — Sicurezza & Fondamenta

*Tutto il resto costruisce su questo. Se le fondamenta sono fragili, ogni feature aggiunta e a rischio.*

### Auth & Accesso
- [x] CRITICO — Rimuovere credenziali admin hardcoded da `AdminLogin.tsx` ✅ Sessione 1
- [x] CRITICO — Implementare ProtectedRoute wrapper per route player ✅ Sessione 1
- [x] CRITICO — Implementare ProtectedAdminRoute wrapper ✅ Sessione 1
- [ ] ALTO — Spostare PIN hashing server-side (Supabase Edge Function con bcrypt + salt) ⏳ Richiede nuovo Supabase
- [ ] ALTO — Aggiungere rate limiting su login: 3 tentativi poi blocco 15 min ⏳ Richiede nuovo Supabase
- [ ] ALTO — Aggiungere scadenza sessione (es. 30 giorni) + refresh automatico
- [ ] MEDIO — Rimuovere opzione "Ricorda PIN" da localStorage (o usare encryption)

### RLS (Row Level Security)
- [ ] CRITICO — Riscrivere RLS policies: rimuovere tutti i "Anyone can update/insert/delete" sulle tabelle critiche
- [ ] CRITICO — `matches`: solo giocatori del match possono aggiornare il risultato
- [ ] CRITICO — `credit_ledger_entries`: solo edge functions (service role) possono inserire
- [ ] CRITICO — `escrow_holds`: solo edge functions possono gestire
- [ ] ALTO — `players`: update limitato al proprio record (via session_token verification)
- [ ] ALTO — `pledge_items`: insert/update limitato al proprio player_id
- [ ] MEDIO — `auction_lots`, `bids`: insert limitato a player autenticati, non al proprietario del pledge

---

## Sprint 2 — Bug Critici

*Cose che sono rotte e impediscono il funzionamento base dell'app.*

### Escrow & Asta
- [ ] CRITICO — Rendere bid + escrow atomici (Supabase Edge Function che gestisce tutta la transazione)
- [ ] CRITICO — Implementare settlement asta: al termine, trasferire crediti da escrow a pledge owner
- [ ] CRITICO — Implementare creazione automatica AuctionLot da pledge approvati quando admin avvia asta
- [ ] CRITICO — Implementare anti-sniping reale: se bid negli ultimi 5 min, estendere `lot.ends_at` +5 min (max 3)
- [ ] ALTO — Bloccare bid del proprietario sul proprio pledge (check server-side, non solo UI)
- [ ] ALTO — Fix lost-update problem: WHERE clause su `current_bid` per verificare che non sia cambiata

### Match & Risultati
- [x] CRITICO — Implementare conferma risultato (PendingConfirmation + Disputed) ✅ Sessione 1
- [ ] ALTO — Aggiungere optimistic locking su match result (version field o check status prima di update)
- [x] ALTO — Validare tournament.status prima di permettere join (solo SignupOpen) ✅ Sessione 1

### Bug specifici
- [ ] CRITICO — Fix bug booleano in `Pledges.tsx` e `PledgeDetail.tsx` (verificato: codice gia corretto, false positive)
- [x] ALTO — Fix `AdminFinalsSection.tsx`: crea round semifinale reale con seeding ✅ Sessione 1
- [x] ALTO — Fix draft pledge visibili a tutti → solo al owner ✅ Sessione 1
- [x] ALTO — Fix `Landing.tsx`: credits display con formatEuros() ✅ Sessione 1
- [ ] MEDIO — Fix `AdminPledgesSection.tsx`: tipo `admin_note` mancante in `PledgeItem` interface

---

## Sprint 3 — Service Layer & Architettura

*Estrarre la business logic dai componenti UI per renderla testabile e manutenibile.*

### Service Layer
- [ ] ALTO — Creare `services/authService.ts` (login, logout, session validation, PIN reset)
- [x] ALTO — Creare `services/matchService.ts` ✅ Sessione 1
- [x] ALTO — Creare `services/creditService.ts` ✅ Sessione 1
- [x] ALTO — Creare `services/auctionService.ts` ✅ Sessione 1
- [x] ALTO — Creare `services/tournamentService.ts` ✅ Sessione 1
- [x] MEDIO — Creare `services/playerService.ts` ✅ Sessione 1

### Edge Functions
- [ ] ALTO — Creare `process-match-result` edge function (calcolo crediti atomico server-side)
- [ ] ALTO — Creare `place-bid` edge function (bid + escrow + anti-sniping atomico)
- [ ] ALTO — Creare `settle-auction` edge function (settlement completo)
- [ ] MEDIO — Migliorare `tournament-engine` con logging e feedback strutturato per admin

### Refactor componenti
- [x] ALTO — Splittare `BlitzTournament.tsx` (897 righe) in 14 file modulari ✅ Sessione 2
- [ ] MEDIO — Splittare `AdminMatchesSection.tsx` (430 righe)
- [ ] MEDIO — Splittare `Tournaments.tsx` (389 righe)
- [x] MEDIO — Standardizzare loading/error/empty states con componenti riutilizzabili ✅ Sessione 1

---

## Sprint 4 — Feature Completamento

*Features che mancano o sono incomplete.*

### Economia crediti
- [ ] ALTO — Implementare stake progressivo per round (x1, x1.5, x2 — configurabile da admin)
- [ ] MEDIO — Aggiungere champion bonus (+100 crediti ciascuno per vincitori finale)
- [ ] MEDIO — Validare `allow_negative_balance` prima di ogni operazione crediti

### Notifiche & Comunicazione
- [ ] ALTO — Generare testo nudge pre-formattato per WhatsApp (Day 3, Day 7, 24h)
- [ ] ALTO — Bottone "Copia per WhatsApp" per admin con messaggio contestuale
- [ ] ALTO — Export risultati torneo come blocco testo copiabile per WhatsApp
- [ ] MEDIO — "Chi ha prenotato" counter visibile: "Marco ha prenotato 3 volte, Luca 0"

### Pairing & Round
- [ ] ALTO — Feedback visivo per admin dopo generazione round (chi gioca con chi e perche)
- [ ] MEDIO — Counter "Regenerate" persistente (salvato nel tournament, non nello state React)
- [ ] MEDIO — Gestione bye UX migliorata: messaggio chiaro "Sei a riposo questo round"

### Auction UX
- [ ] ALTO — Real-time bid updates per TUTTI i viewer (non solo chi ha fatto il bid)
- [ ] MEDIO — Bid minimum = estimate_low (impedire bid a 1 credito)
- [ ] MEDIO — Notifica in-app quando sei stato superato su un lotto

---

## Sprint 5 — Polish & UX

*Rifinitura dell'esperienza utente.*

### Navigazione & Layout
- [x] ALTO — BottomNav condizionale: nascondere su login, admin, onboarding ✅ Sessione 1
- [ ] MEDIO — Aggiungere breadcrumb per sotto-pagine (Match > Pledge > LotDetail)
- [ ] MEDIO — Persistere sezione accordion aperta in admin (URL param o localStorage)

### Consistenza UI
- [ ] MEDIO — Standardizzare empty states (stesso pattern ovunque)
- [ ] MEDIO — Standardizzare loading states (stesso spinner/skeleton ovunque)
- [ ] MEDIO — Rimuovere tutti i valori hardcoded dai componenti (URL club, bet max, payout)
- [ ] BASSO — PlayerLink: tooltip per nomi lunghi troncati
- [ ] BASSO — EuroDisclaimer: rimuovere TooltipProvider duplicato

### Mobile UX
- [ ] MEDIO — Countdown timer: sync con server time per evitare drift
- [ ] MEDIO — Paginazione per liste grandi (players, leaderboard, bids)
- [ ] BASSO — Podium section responsive per schermi piccoli
- [ ] BASSO — Mobile breakpoint: documentare perche 768px invece di 640px

### Accessibilita
- [ ] MEDIO — aria-label su tutti i bottoni icon-only
- [ ] BASSO — Verificare contrasto WCAG sui colori accent su dark theme

---

## Sprint 6 — Testing & Deploy

- [ ] ALTO — Test unitari per service layer (crediti, escrow, pairing)
- [ ] ALTO — Test integrazione per flussi critici (bid, match report, auction settlement)
- [ ] MEDIO — Error boundaries globali con UI di recovery
- [ ] MEDIO — Monitoraggio errori (Sentry o simile)
- [ ] BASSO — PWA: service worker caching per offline basic
- [ ] BASSO — Analytics: evento tracking per azioni chiave

---

## Backlog (post-MVP)

- [ ] Eliminare dipendenza `lovable-tagger` dal package.json
- [ ] i18n: supporto multilingua (IT/EN/ES)
- [ ] Dark/light mode toggle
- [ ] Cronologia match per giocatore con grafici performance
- [ ] Sistema di achievement/badge
- [ ] Foto del match (upload post-partita)
- [ ] Admin: bulk import giocatori da CSV
- [ ] Admin: template messaggi nudge personalizzabili

---

## Contatori progresso

| Sprint | Totale task | Completati | % |
|---|---|---|---|
| Prerequisito | 5 | 3 | 60% |
| Sprint 1 — Sicurezza | 13 | 3 | 23% |
| Sprint 2 — Bug critici | 12 | 5 | 42% |
| Sprint 3 — Architettura | 12 | 7 | 58% |
| Sprint 4 — Features | 11 | 0 | 0% |
| Sprint 5 — Polish | 13 | 1 | 8% |
| Sprint 6 — Testing | 6 | 0 | 0% |
| **TOTALE** | **72** | **19** | **26%** |
