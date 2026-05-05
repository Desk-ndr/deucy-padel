# Deucy Padel — Padel Chaos Cup

> Progetto personale con Rollo (rollodcbryant). App web mobile-first per gestire tornei di padel tra amici con partner rotanti, economia a crediti, e asta digitale 24h finale.

## Metadata

| Campo | Valore |
|---|---|
| **Partner** | Rollo (rollodcbryant-git su GitHub) |
| **Tipo** | Web App (mobile-first, link-based) |
| **Stack** | React 18 + TypeScript + Vite + Supabase + shadcn/ui + Tailwind CSS |
| **Lingua app** | EN (con microcopy playful) |
| **Lingua comunicazione** | IT (tra Andrea e Rollo) |
| **Budget** | Progetto personale — nessun budget cliente |
| **Canale** | Progetto proprio |
| **Repo** | [github.com/rollodcbryant-git/deucy-padel](https://github.com/rollodcbryant-git/deucy-padel) |
| **Supabase (Lovable)** | Istanza attiva — NON TOCCARE (usata dalla versione Lovable) |
| **Supabase (nuova)** | Da creare — istanza separata per la versione refactored |

## Timeline

- **Avvio:** 2026-02-05 (primo commit Lovable)
- **Audit completo:** 2026-04-12 (sessione Claude)
- **Fase attuale:** Post-audit — Refactor & completamento features
- **Status:** 🟡 Active — Migrazione da Lovable a sviluppo diretto

## Obiettivo

Creare un'app completa e funzionante per gestire tornei di padel tra amici (8-24 giocatori): signup, round automatici con pairing intelligente, match con prenotazione campo, economia crediti, leaderboard, pledge items, e asta finale 24h stile Catawiki.

## Prossima milestone

**2026-04-XX** — Completare refactor sicurezza (auth, RLS, route protection) + fix dei bug critici identificati nell'audit.

## Quick links

- [Memory Claude](MEMORY.md)
- [Todo attivi](TODO.md)
- [Lovable Plan](.lovable/plan.md)
- GitHub: [rollodcbryant-git/deucy-padel](https://github.com/rollodcbryant-git/deucy-padel)

## Stack tecnico dettagliato

- [x] React 18 + TypeScript + Vite
- [x] Supabase (DB PostgreSQL + Auth + Realtime + Storage)
- [x] shadcn/ui + Radix UI primitives
- [x] Tailwind CSS 3.4 (dark theme)
- [x] TanStack React Query (server state)
- [x] React Hook Form + Zod (forms + validation)
- [x] React Router 6 (routing)
- [x] Recharts (data visualization)
- [x] PWA support (install prompt)
- [ ] Service layer (da creare — attualmente Supabase chiamato direttamente ovunque)
- [ ] Test suite (Vitest configurato ma vuoto)
- [ ] RLS policies robuste (attualmente troppo permissive)
- [ ] Edge Functions per business logic critica (pairing, crediti, escrow)

## Architettura attuale

```
src/
  pages/           35 file (~8.500 righe) — pagine player + admin + blitz
  components/      13 cartelle feature-specific + ui/ (shadcn)
  contexts/        PlayerContext (auth + state globale)
  hooks/           7 custom hooks
  integrations/    Supabase client + generated types
  lib/             types.ts, euros.ts, blitz-schedule.ts, phone.ts
supabase/
  migrations/      20 migrazioni (Feb-Apr 2026)
  functions/       Edge functions (tournament-engine)
```

## Stato features (post-audit 2026-04-12)

| Feature | Stato | Note |
|---|---|---|
| Join via link + phone/PIN | Funzionante | PIN hashing debole, da rinforzare |
| Login + sessione persistente | Funzionante | Nessuna scadenza sessione |
| Tournament create (admin) | Funzionante | Credenziali admin hardcoded nel codice |
| Player roster + confirm | Funzionante | |
| Round generation | Parziale | Delegato a edge function, no feedback UI |
| Match pairing | Parziale | Algoritmo in backend, no transparency |
| Match reporting | Parziale | Nessuna conferma avversario, no lock |
| Booking claim | Funzionante | |
| Credit ledger | Parziale | Calcoli corretti ma nessun stake progressivo |
| Leaderboard | Funzionante | No paginazione, tie-breaking incompleto |
| Pledge submission | Funzionante | Draft visibili a tutti (bug) |
| Auction house | Parziale | UI presente, anti-sniping NON implementato |
| Escrow system | Rotto | Race conditions, settlement mancante |
| Bid system | Parziale | Lost update problem, no real-time per altri viewer |
| Playoffs/Finals | Rotto | Bottone "Conferma" non esegue nulla |
| Blitz tournaments | Funzionante | 897 righe in un file, da splittare |
| Betting system | Funzionante | Valori hardcoded |
| Waitlist | Funzionante | No real-time position update |
| Notifications/Nudges | Non esiste | Nessuna implementazione |
| Export WhatsApp | Non esiste | |
| Route protection | Non esiste | Tutte le pagine accessibili senza login |

## Decisione strategica (2026-04-12)

**Continuiamo da questo codice** con refactor mirato. NON si rifà da zero. Si crea una nuova istanza Supabase separata, si consolida lo schema, e si lavora sul codice esistente. La versione Lovable resta intatta sul suo Supabase.

## Note

- Il progetto nasce su Lovable (AI code gen) — il codice ha qualita inconsistente
- 20 migrazioni DB in 2 mesi indicano design iterativo, non errori strutturali
- Lo schema base e ben fatto (enums, constraints, FK, storage buckets)
- Il problema principale e l'assenza di service layer e la business logic nei componenti UI
