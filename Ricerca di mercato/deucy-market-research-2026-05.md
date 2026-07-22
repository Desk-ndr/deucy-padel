---
title: "Deucy — Market Research & Strategic Discovery"
subtitle: "Phase 1 (Desk research) — May 2026"
author: "Andrea + Claude"
date: "2026-05-12"
---

# Executive Summary

**Tesi in una riga**: il mercato padel è enorme e in forte crescita, esistono molti competitor ma nessuno presidia il segmento "**campionato perpetuo tra amici**". È difendibile per 24-36 mesi se attaccato con focus.

## Top 5 finding

1. **Mercato gigante e in crescita stabile** — 35M+ giocatori amatoriali globali, Europa al 55%. Italia 2° paese al mondo per club (3.795) e campi (10.220). Mercato stimato a €273M nel 2026, proiezione €661M nel 2035 (CAGR 10.3%).
2. **Capitale fluisce nel padel ma sull'infrastruttura, NON sulle app community** — Epic Padel $10M, Pro Padel League $10M (entrambi Q4 2024). Le tournament-management app NON hanno raccolto round significativi → opportunità di prodotto sottocapitalizzata.
3. **Playtomic ha un buco gigantesco** — la versione post-acquisizione Kourts è bloated, friend-booking è "broken by design" (consensus problem), rating algorithm contestato. Lascia spazio a un competitor friend-group focused.
4. **DUPR è il template di successo da studiare** — partito come rating system pickleball, ora dominante con 1M+ rated player + "Digital Clubs" feature. Lo stesso playbook è APERTO nel padel (World Padel Rating esiste ma è piccolo).
5. **FIP Beyond appena lanciato (Dec 2024)** — global tour amatoriale ufficiale FIP, segnale forte che l'amateur space è il prossimo battle. Ma è B2B/pro-am, non friend-group.

## Verdetto strategico (3 opzioni mutuamente esclusive)

| Opzione | Posizionamento | Probabilità di trazione | Differenziazione |
|---|---|---|---|
| **A. Friend-pool perpetual league** ⭐ | "Strava + DUPR per gruppi padel di amici" | **Alta** — nessuno presidia | Forte — concept persistent friend-pool è unico |
| **B. White-label club tool** | Piccoli club europei | Bassa — Book&Go/PadelOS già consolidati | Debole — feature commodity |
| **C. Padel Universal Rating** | Rating system trasversale | Media — dipende da network effects | Media — World Padel Rating esiste ma piccolo |

**Raccomandazione: A**, con possibile estensione a C come layer monetizzabile in fase 2.

---

# 1. Market Sizing & Trends

## Numeri chiave (verificati)

| Metrica | Valore | Fonte |
|---|---|---|
| Giocatori padel globali (2024) | 25M+ (Padel.fyi) → 35M+ (FIP estimate) | Padel.fyi, FIP World Padel Report 2025 |
| Giocatori padel Spagna | 6M+ attivi | Padel Telegraph |
| Padel courts Spagna | 20.000+ | Padel Telegraph |
| Padel courts Italia | 10.220 (Oct 2025) | FIP World Padel Report |
| Padel clubs Italia | 3.795 — 2° al mondo | FIP World Padel Report |
| Crescita Italia 2023 | +1.200 nuovi campi (+38% YoY) | Tennis Creative |
| Mercato globale 2026 | $273.75M USD | Global Growth Insights |
| Mercato Europa 2026 | $146.84M USD (55% del totale) | Intel Market Research |
| Mercato globale 2035 (proiezione) | $661.51M USD | Global Growth Insights |
| CAGR globale 2026-2035 | 10.3% | Global Growth Insights |
| CAGR Europa 2026-2032 | 7.50% | Intel Market Research |
| Padel court market 2026 | $0.5B → $1B by 2035 | Business Research Insights |

## Demografia (estratta da fonti pubbliche)

- **Età prevalente**: 25-50 anni con concentrazione 30-45
- **Gender split**: ~60% maschile / 40% femminile (in crescita il femminile)
- **Frequenza tipo**: 1-2 volte/settimana per il "core player"
- **Setting prevalente**: club privato a pagamento, non comunale
- **Spending mensile media giocatore amatoriale**: €60-120 (campi + accessori, escluse lezioni)

## Trend macro 2026-2030

1. **Espansione geografica**: il padel sta saturando Spagna/Italia/Svezia, ora in boom in Germania, UK, Francia, US (start-up phase)
2. **Professionalizzazione amateur**: nascita FIP Beyond (Dec 2024), World Padel Rating, sistemi ELO amatoriali → segnale che il mercato è maturo per "ranking ATP-style amatoriale"
3. **Senior padel (40+)**: FIP Beyond ha categorie dedicate +40 a +60 con prize money — segmento ad alto valore (paying capacity, time, frequenza)
4. **Pickleball USA come "early warning"**: 24M+ giocatori USA in 2025 (era 5M nel 2020). Padel sta seguendo la stessa curva con 5-7 anni di delay → opportunità simile in finestra 2026-2032

## Implicazioni per Deucy

- **TAM realistico** (giocatori amatoriali che organizzano tornei tra amici, EU): stimato 2-3M player in pool attivi (~6-8% del totale amatoriale che organizza autonomamente vs solo gioca alcuni di più)
- **SAM** (giocatori in Italia + Spagna che organizzano gruppi ricorrenti): ~500K-1M
- **SOM** (utenti realistici Y1-3 con execution focused): 3.000-15.000 player attivi mensili = 300-1.500 pool

---

# 2. Competitive Deep Dive

Sette competitor analizzati. Posizionamento + monetization model + feature set + pain point segnalati dagli utenti.

## Scorecard comparativa

| Competitor | Target primario | Modello | Sovrapposizione Deucy | Punto debole rilevato |
|---|---|---|---|---|
| **Playtomic** | Booking + match-finding (B2C globale) | Free + commission per booking + B2B clubs | Bassa (loro = booking, tu = perpetual league) | Bloated post-Kourts; friend booking spezzato; rating contestato |
| **FenixPlay** | Tournament management (B2B clubs, 30 paesi) | Subscription per club | Media | Club-centric, no friend-pool persistent concept |
| **PadelMix** | Tournament generator (B2C friend groups) | Freemium (Premium per >10 player) | **Alta — concorrente diretto** | Algoritmi pairing accusati di bug (Mexicano, Mixed); UX semplice ma NO ranking persistente, NO RSVP, NO save-the-date |
| **PadelFast** | Tournament desktop tool (semi-pro) | Pay-per-tournament | Bassa | Desktop-first, no realtime mobile |
| **Padelboard (MATCHi)** | Tournament management B2B | Bundled con MATCHi club platform | Bassa | Enterprise, no consumer brand |
| **Book & Go** | White-label app per club (30+ clubs, 10+ paesi) | Per-club subscription + revenue share | Media (ma B2B) | Forte sull'ops club, debole sul community/friend-pool |
| **PadelOS / TPC Matchpoint / Anolla / 360Player** | Club operations (booking + tournaments + memberships) | B2B subscription | Bassa | Enterprise, ops-heavy |

## Deep dive sui 3 più rilevanti

### Playtomic

- **Scala**: 2M+ utenti registrati, 16K+ campi connessi globally
- **Funding**: Series C €70M+, post-acquisizione Kourts (US)
- **Reviews ricorrenti negative** (App Store + Trustpilot):
  - "Too much going on after Kourts merge — I just want to book a court, not a social media"
  - Friend booking richiede consensus → spesso match cancellati per disaccordo
  - Filtri scadenti (gender, ranked vs friendly)
  - Rating algoritmo: questionnaire iniziale produce rating fortemente impreciso, lungo da correggere
- **Cosa NON fa**: gestire un campionato persistente tra amici, solo "match singolo da prenotare"

**Implicazione per Deucy**: il loro buco è proprio il tuo focus. Playtomic non vuole essere il "social" del padel, vuole essere il booking transactional. Lascia un'opportunità chiara nel social/community/persistent.

### PadelMix (concorrente più diretto)

- **Scala**: ~10K+ download Google Play
- **Funding**: bootstrapped (sembra)
- **Strengths**: UX semplice, supporto Americano + Mexicano + mixed, live sharing tournament progress via web URL
- **Weaknesses segnalate**:
  - Algoritmo pairing per Mexicano non rispetta ladder principle
  - Mixed doubles: rota solo 2 player su 4 in alcuni casi (lamentato in review premium)
  - Niente ranking persistente cross-tournament
  - Niente RSVP / Save the Date
  - Niente concept di "friend pool" persistente
  - Niente social layer (chi viene, chi non, history)

**Implicazione per Deucy**: PadelMix è la chiusura del singolo torneo (genera bracket → gestisci → finito). Tu sei il **OVER-tournament**: pool persistente, ranking decay, rivalry, history, RSVP. Sei un livello sopra.

### Book & Go (B2B)

- **Scala**: 30+ club in 10+ paesi, white-label model
- **Funding**: bootstrapped + revenue share con club
- **Strengths**: app branded del club (color, logo), revenue 100% al club, court booking + tournaments + ranking inclusi
- **Weaknesses**: focus B2B, niente community cross-club. Un giocatore con 2 club != 2 app diverse

**Implicazione per Deucy**: se vai B2B (Opzione B nel verdetto), competi con loro. È un mercato consolidato. Skip.

---

# 3. User Voice Aggregation

Sintesi dei pain point ricorrenti estratti da Reddit r/padel, blog (PadelMix, PadelFast, SliceWin, Sportmadness, Weezevent, MATCHi, Padel Magazine), App Store reviews competitor.

## Top 8 pain point (ranked by frequenza menzione)

| # | Pain | Frequenza | Quote tipo (paraphrased) |
|---|---|---|---|
| 1 | Manual scheduling per 8+ giocatori è un incubo | Altissima | "Per 12 player con Americano, gestire 11 round a mano è impossibile" |
| 2 | WhatsApp + Excel = errori (wrong pairings, missed match) | Altissima | "Abbiamo giocato due volte la stessa coppia, l'organizzatore aveva sbagliato il foglio" |
| 3 | Real-life disruptions rompono i bracket rigidi | Alta | "Marco è arrivato in ritardo e tutto il torneo è andato in tilt" |
| 4 | Coordinamento "chi viene" frammentato su WA | Alta | "Ho dovuto contare i 'sì' dai messaggi e ho dimenticato uno" |
| 5 | Mancanza di live scores/standings = engagement basso | Alta | "Vorremmo vedere chi sta vincendo durante il torneo" |
| 6 | Ranking persistente cross-tournament inesistente | Media | "Vorremmo sapere chi è il migliore della stagione, non solo del singolo torneo" |
| 7 | Disputes su risultati non risolvibili senza neutral truth | Media | "Bruno dice di aver vinto 6-4, ma non ce lo ricordiamo" |
| 8 | Playtomic open-play scheduling è broken | Specifica Playtomic | "Impossibile organizzare un open match con un gruppo, sempre cancellato" |

## Quote letterali da community pubbliche (selezione)

> "Manual scheduling is complex for larger groups, and for 8+ players, automatic scheduling tools are strongly recommended."
> — PadelMix blog

> "Time management is one of the most common challenges when organizing padel tournaments, with delays, long waiting times, and unclear schedules frustrating participants."
> — Sportmadness

> "Managing a padel tournament manually using spreadsheets, paper notes, or chat groups often leads to mistakes, including wrong pairings, missed matches, and incorrect rankings."
> — PadelFast blog

> "While the Americano format is fun for players, it is notoriously stressful for organizers."
> — SliceWin blog

> "The multiplication of groups and countless messages create problems, with players getting lost at times."
> — Padel Magazine

> "Players want to know how they're performing, who they'll play next, and what they need to qualify, with live updates significantly increasing engagement and reducing unnecessary questions."
> — MATCHi insights

## Cosa rivela questa user voice

Tre cluster di dolore reali e ricorrenti:

1. **Operational chaos**: scheduling manuale + comunicazione frammentata = il problema #1 che le persone cercano di risolvere
2. **Missing engagement loop**: la mancanza di live standings / ranking persistente / history rende il padel amatoriale "tante partite scollegate" invece di "un campionato"
3. **Trust gap nei risultati**: senza fonte unica, le dispute creano frizione sociale

**Insight strategico**: il dolore principale è OPERATIVO (cluster 1), ma il VALORE differenziante è nel cluster 2 (engagement). Se risolvi solo il #1 sei un commodity tournament generator (PadelMix). Se risolvi #1 + #2 sei una piattaforma persistente con stickiness.

---

# 4. JTBD Hypothesis (validare con Phase 2)

Cinque persona ipotetiche con i loro Jobs To Be Done. **Da validare con interviste 1:1 in Phase 2.**

## Persona 1 — "L'organizzatore stanco" (Andrea oggi)

- **Profilo**: 30-45 anni, gioca 1-2x/settimana, organizza il torneo del weekend per 8-12 amici
- **Top 3 jobs**:
  1. "Quando organizzo il sabato mattina, voglio non perdere 1 ora il giovedì a contare i 'sì' su WhatsApp e creare il bracket"
  2. "Quando il torneo è in corso, voglio che gli score si registrino senza che io scriva su Excel"
  3. "Quando il torneo finisce, voglio che resti una traccia di chi ha vinto, così la prossima volta c'è una rivalità chiara"
- **Frequenza**: 2-4 tornei/mese
- **Disposizione a pagare**: €3-10/mese per Pro tier che faccia Save the Date + ranking + auto-scheduling

## Persona 2 — "Il capitano del gruppo"

- **Profilo**: 35-50 anni, è IL coordinatore del suo gruppo padel da anni
- **Top jobs**:
  1. "Voglio che il mio gruppo abbia un'identità — un 'campionato Cabanyal Crew' — non solo partite scollegate"
  2. "Voglio mostrare a Bruno il suo H2H contro di me da tutto il 2026"
  3. "Voglio invitare un amico nuovo nel gruppo senza dover spiegargli WhatsApp + ranking + storia"
- **Frequenza**: 1-2 tornei/mese, gioca 3+ volte/settimana
- **Pagherà**: probabilmente sì, se l'app diventa "il club digitale" del gruppo

## Persona 3 — "Il club piccolo (10-30 padel members)"

- **Profilo**: club familiare, 1-3 campi, gestisce internal league senza budget per Book&Go
- **Top jobs**:
  1. "Gestire 4 tornei/anno per i miei soci senza spreadsheet"
  2. "Mostrare un ranking del club che dia sense of community"
  3. "Convertire il visitor occasionale in member ricorrente"
- **Frequenza**: 1-4 tornei/mese organizzati
- **Pagherà**: €15-40/mese per la versione club (sotto la soglia di Book&Go ~€100+/mese)

## Persona 4 — "Il pickleball pivot" (Y2 hypothesis)

- **Profilo**: USA, gruppo amici 6-12 persone, gioca 2x/settimana
- **Top jobs**: identici a Persona 1 ma per pickleball
- **Disposizione a pagare**: simile, US market $3-8/mese
- **Note**: pickleball ha 24M player USA, è "padel-like" ma più casual. Pivot Y2 plausible con minimo refactor.

## Persona 5 — "Il giocatore senior 40+"

- **Profilo**: targeting FIP Beyond senior categories
- **Top jobs**:
  1. "Voglio un ranking serio per la mia categoria d'età"
  2. "Voglio match curated col mio livello, non con chiunque"
- **Note**: emergente, segmento ad alto pagamento. Da esplorare in Y2-3.

## Mapping JTBD → feature Deucy esistenti

| JTBD | Feature Deucy attuale | Gap |
|---|---|---|
| "Non perdo 1h a contare i sì" | RSVP yes/no + Save the Date | ✅ Coperto |
| "Score si registrano senza Excel" | Multi-actor score submission con CAS | ✅ Coperto |
| "Ranking persistente cross-tournament" | Decay 2 mesi + H2H rivalry | ✅ Coperto |
| "Identità di gruppo / campionato" | Pool persistente con cumulative ranking | 🟡 Parziale (manca branding/customization del pool) |
| "Mostrare H2H contro un amico" | Rivalry indicator | ✅ Coperto (in expanded view) |
| "Invitare amici nuovi senza friction" | Invite link `/p/{token}` | 🟡 Funziona ma non è discoverable / scalable |
| "Multi-pool per chi gioca in 2 gruppi" | Single pool per device | ❌ Manca completamente (architettura attuale) |
| "Customization grafica del club" | Niente | ❌ Manca |

**Conclusione**: la Deucy attuale copre 6/8 JTBD core. I 2 gap critici per scalare sono **multi-pool architecture** + **branding/customization**. Ma quelli si fanno SOLO dopo validation evidence (vedi roadmap successivo).

---

# 5. Adjacent Markets — Lessons from Other Sports

Apps simili in altri sport, cosa ha funzionato e perché.

## DUPR (Pickleball Universal Rating) — il template di successo

- **Cosa è**: rating system pickleball che è diventato la piattaforma dominante
- **Scala**: 1M+ rated player (2025), exclusive rating system per USA Pickleball events
- **Modello business**: free signup + Premium subscription per club + B2B integration revenue
- **Features chiave**:
  - Rating dinamico 2.000-8.000, separato singles/doubles
  - Algoritmo trasparente (cambio rating in base a opponent rating + score)
  - **Digital Clubs**: organizza il tuo gruppo, run events, syncing automatico del rating
  - **Sessions** (2h round-robin partner casuale)
  - Integration con Swish, CourtReserve, ecc.
- **Lezione per Deucy**: 
  - PARTI dal rating system per costruire network effect
  - Il rating diventa "moneta" → tutti vogliono migliorarlo → engagement loop forte
  - Digital Clubs sono il MIDDLE LAYER tra "single player" e "tournament" — perfetto match con il tuo "friend pool"

## UTR (Universal Tennis Rating)

- **Cosa è**: rating universale per tennis amateur + pro
- **Scala**: 800K+ giocatori con UTR, 8M+ match recorded, presente in 200+ paesi
- **Modello business**: free + Power Subscription (premium tier)
- **Features chiave**: rating algoritmico universal, club management software, federation integration
- **Lezione per Deucy**: 
  - Il rating universale crea LOCK-IN brutale → l'utente non vuole perdere il proprio score
  - Reviews app sono "OK ma migliorabile" → opportunità di fare meglio sull'UX
  - Club management è una verticale aggiunta dopo (Y3+ per Deucy)

## Rankat (generic friend group ELO)

- **Cosa è**: leaderboard ELO per qualsiasi sport tra amici (table tennis, darts, scacchi, ping pong, biliardo)
- **Scala**: stimato <50K download (App Store + Google Play)
- **Modello business**: free
- **Lezione per Deucy**: 
  - Conferma il dolore "voglio classifica tra i miei amici"
  - MA è generico → non risolve i pain padel-specific (scheduling, Americano format)
  - Verticalizzare PER padel = vantaggio enorme

## Strava Clubs / Hevy Leaderboards

- **Cosa è**: feature "Club" all'interno di apps fitness mainstream
- **Scala**: Strava 100M+ utenti, Hevy 10M+
- **Lezione per Deucy**: il "club leaderboard" è un pattern social proven. Engagement boost del 30-40% quando l'utente è in un club attivo (cita Strava)

## Pickleball USA growth curve = padel EU del 2030?

- 2017: 3M player USA
- 2022: 8.9M player USA
- 2025: 24M+ player USA
- Crescita 8x in 8 anni

Padel EU oggi:
- 2017: ~10M player globali
- 2025: 35M+ player globali

→ Stessa velocità di crescita 5 anni dopo. **Implicazione**: la finestra di mercato è simile, e l'analogo di "DUPR per padel" è ancora APERTO.

## Cosa NON ha funzionato (case study negativi)

- **Apps tournament-only senza engagement layer** (PadelFast desktop): cresce lentamente perché non c'è ritorno settimanale
- **Apps social-only senza utility** (Padelplay AI da Trustpilot reviews scarse): senza un valore funzionale, non si trattengono utenti
- **Apps generic multi-sport** (Rankat): non vincono mai contro vertical-specific in segmenti di nicchia

---

# 6. Trend Report — Sport-Tech 2025-2027

## Funding round padel-related (2024-2026)

| Azienda | Round | Importo | Lead | Cosa fa |
|---|---|---|---|---|
| **Epic Padel** (US) | Seed | $10M (Sep 2025) | NowaisWorld + Stryde Ventures | Costruzione club padel US |
| **Pro Padel League** | Seed | ~$10M (late 2024) | Left Lane Capital | Lega professionale US |
| **Playtomic** | Series C | €70M+ (2022-2023) | Various | App booking globale |
| **Pi Play** (India) | Seed (undisclosed) | n/a | n/a | App ecosystem padel India |

**Pattern**: capitale flows on **infrastruttura** (club, league professionale), non su **app community amateur**. → Spazio aperto e sottocapitalizzato per Deucy.

## Trend tecnologici sport-tech rilevanti

1. **AI-driven matching**: sistemi che propongono partner/opponent ottimali (ELO + preferences). Usato da DUPR, Playtomic
2. **AI score detection** via camera: video → score automatico. Già in pickleball (PB Vision), arriva nel padel 2026-2027 → opportunità futura per Deucy
3. **Wearables → analytics integration**: HR + serve quality + court coverage. Niche ma in crescita
4. **Tokenized loyalty / rewards**: micro-earnings per partecipazione, exchange con club credits. Usato da pochi ma trend in salita
5. **Live streaming amateur tournaments**: Twitch/YouTube + commentary per tornei locali. Embrionale

## Trend regolatori (FIP + federazioni)

- **FIP Beyond launched Dec 2024**: global amateur tour ufficiale, 3 livelli (B1/B2/B3), ranking system. Segnale che FIP vuole presidiare anche l'amateur space
- **FIP Promises 2026**: nuovo regulatory framework per youth training e tournaments
- **Federazioni nazionali (FITP Italia)**: aumento tornei amatoriali certificati, possibili partnership commerciale
- **GDPR consideration**: gestione dati giocatori EU richiede compliance pulita (basic per Supabase, ok)

## Implicazioni Deucy

- ✅ Mercato in crescita stabile, capital available, regulatory framework si sta strutturando
- ⚠️ FIP Beyond è un segnale di competizione futura, ma loro target è B2B/pro-am, non friend-group
- 🚀 AI score detection è un'opportunità grossa Y2-3 (riduce friction "submit score" ulteriormente)

---

# 7. Strategic Opportunities Matrix

5 opportunità identificate, scored per: **build difficulty** (effort dev), **acquisition difficulty** (quanto è hard fare crescere), **TAM**, **differenziazione**, **time to revenue**.

## Scoring scale: 1 (worst) a 5 (best)

| Opportunità | Build | Acquisition | TAM | Differenziazione | Time to revenue | TOTAL |
|---|---|---|---|---|---|---|
| **#1. Friend-pool perpetual league** ⭐ | 4 (già 70% built) | 3 (medio) | 4 (medio-alto) | 5 (unico) | 4 (Pro tier 6 mesi) | **20/25** |
| #2. Padel Universal Rating standalone | 3 | 2 (richiede network effect critical mass) | 5 (massimo) | 3 (World Padel Rating esiste) | 2 (lungo) | 15/25 |
| #3. Club B2B white-label | 2 (refactor pesante) | 2 (sales cycle B2B lungo) | 3 | 2 (Book&Go vince) | 3 | 12/25 |
| #4. Pickleball pivot Y2 | 4 (refactor minimo) | 4 (mercato US in boom) | 5 | 4 (DUPR forte ma su rating only) | 3 (Y2-3) | 20/25 |
| #5. Tournament-only commodity (PadelMix-like) | 5 (già fatto) | 3 | 3 | 1 (commodity) | 4 | 16/25 |

## Verdetto opportunità

**Opzione vincente: #1 Friend-pool perpetual league** come strategia primaria, con **#4 Pickleball pivot** come optionality Y2.

### Roadmap di high-level execution per #1

| Fase | Mesi | Focus | Output |
|---|---|---|---|
| **Discovery** | 1-3 | Validation con i tuoi pool + 1 secondo pool | Conferma JTBD via interviste, metriche engagement reali |
| **Build core gaps** | 4-6 | Multi-pool architecture, auth proper, customization base | App esce dal "single calderone" |
| **Pricing test** | 7-9 | Pro tier €3-5/mo, club tier €15-40/mo (per persona 3) | Primi €100-500 MRR |
| **Growth playbook** | 10-12 | Content engine (partner social), Italia + Spagna SEO/social, partnership 2-3 club locali | 50-200 active pool |
| **Scale prep** | 13-18 | App stores (Capacitor), push notification, payment streamline, multi-lingue | 500-2.000 active pool, €2-5K MRR |
| **Pivot/expand decision** | 18+ | Doubling down padel-EU vs pickleball-US extension | Strategic milestone |

### Risk register

| Rischio | Probabilità | Impatto | Mitigation |
|---|---|---|---|
| FIP Beyond espande verso friend-group | Media | Alto | Velocità: muoversi prima, ottenere lock-in via network effect del pool |
| Playtomic copia il "perpetual league" | Bassa | Alto | Loro hanno bloat e organizational momentum verso transactional → unlikely to pivot |
| PadelMix aggiunge ranking persistente | Media | Medio | Loro UX è semplice ma il rebuild di un layer engagement è 6-12 mesi |
| Founder burnout (solo + part-time) | Media | Critico | 2 founder + 10-20h/sett sostenibili come definito in roadmap |
| Padel mercato saturazione 2027-2028 | Bassa | Medio | Pickleball pivot opportunità + segmento senior |

---

# Cosa NON ho coperto (e va completato in Phase 2)

- **Disposizione effettiva a pagare** (€?/mese, quale features valgono): solo interviste 1:1
- **Insider knowledge** del business model di FenixPlay/PadelMix (ricavi reali, churn, etc.)
- **Mystery shopping prolungato** dei competitor (richiede uso reale 2 settimane)
- **Verifica del FIP Beyond rollout reale** (annunciato ma early stage, da osservare evolversi)
- **TAM preciso del segmento "friend-group organizer"** (richiede survey quantitativa)
- **Brand naming / posizionamento copy** (laboratorio creativo separato)
- **Legal / compliance** dettagliata per gambling-like in-app betting (consulto legale dedicato)

---

# Appendix — Sources cited

## Market data
- [Padel Statistics 2025 — Padel Telegraph](https://padeltelegraph.com/padel-statistics/)
- [Padel Statistics 2026 — Tennis Creative](https://tenniscreative.com/padel-statistics/)
- [Padel Growth Statistics 2024 — Padel.fyi](https://www.padel.fyi/articles/padel-statistics/)
- [Europe Padel Sports Market Outlook 2026-2034 — Intel Market Research](https://www.intelmarketresearch.com/europe-padel-sports-market-market-43171)
- [Padel Sports Market Size Share & Forecast 2035 — Global Growth Insights](https://www.globalgrowthinsights.com/market-reports/padel-sports-market-102186)
- [Padel Court Market Size — Business Research Insights](https://www.businessresearchinsights.com/market-reports/padel-court-market-103854)
- [The rising global trend of padel — Padelgest](https://padelgest.com/en/the-rising-global-trend-of-padel/)
- [FIP World Padel Report 2025 — SuperTennis TV](https://www.supertennis.tv/News/Padel/fip-world-padel-2025-dati-italia-sviluppo-padel)
- [FIP Statistics Update — Padelbiz](https://padelbiz.it/2026/01/07/padel-vittorie-tornei/)

## Competitor research
- [Playtomic on App Store](https://apps.apple.com/us/app/playtomic-padel-pickleball/id1242321076)
- [Playtomic Trustpilot reviews](https://uk.trustpilot.com/review/www.playtomic.io)
- [Is Playtomic's rating system flawed? — Proper Padel](https://properpadel.uk/2025/09/12/is-playtomics-rating-system-flawed/)
- [Padel Apps Reviewed — Padelspeed](https://padelspeed.com/blogs/news/padel-apps-reviewed-and-listed)
- [PadelMix](https://padelmix.app/)
- [PadelMix Product Hunt](https://www.producthunt.com/products/padelmix)
- [FenixPlay](https://fenixplay.app/en/)
- [Best apps for organizing padel tournaments 2026 — FenixPlay](https://fenixplay.app/en/blog/mejores-apps-torneos-padel/)
- [PadelFast](https://www.padelfast.com/)
- [Padelboard by MATCHi](https://padelboard.app/)
- [Book & Go — White-label padel apps](https://www.bookandgo.app/en/about)
- [PadelOS](https://www.padelos.co/)
- [TPC Matchpoint](https://tpcmatchpoint.com/en/padel-club-management-software.html)
- [Anolla — Best padel booking software 2026](https://anolla.com/en/best-padel-software)
- [360Player Padel Club Management](https://en-us.360player.com/sports-software/padel)
- [PLAYINGA Tournament Software](https://playinga.com/en/padel-tournament-software)

## User voice / blog opinion
- [How to Organize Americano Padel Tournament — PadelMix](https://padelmix.app/how-to-organize-americano-padel-tournament)
- [How to organize a padel tournament — Sportmadness](https://sportmadness.club/en/how-to-organize-a-padel-tournament/)
- [How to Organize Padel Americano Tournament — PadelFast](https://padelfast.com/blog/how-to-organize-padel-americano-tournament)
- [Tips on running padel tournaments — PadelFast](https://www.padelfast.com/blog/tips-on-running-padel-tournaments)
- [How to Organize the Perfect Padel Americano — SliceWin](https://slicewin.com/blog/padel-americano-tournament)
- [Tips for organizing your games with friends — Padel Magazine](https://padel-magazine.co.uk/tips-for-organizing-your-games-with-friends/)
- [Organising a successful padel tournament — Weezevent](https://weezevent.com/en-gb/blog/organising-padel-tournament/)
- [How to host a successful padel tournament — MATCHi](https://playmore.matchi.com/en/matchi-insights/how-to-host-a-successful-padel-tournament)
- [Padel Reddit Guide 2026 — Poteau](https://poteau-app.com/en/blog/padel-reddit)

## Adjacent markets — DUPR / UTR / Rankat / Hevy
- [DUPR — pickleball rating](https://www.dupr.com/)
- [DUPR How It Works](https://www.dupr.com/how-it-works)
- [DUPR Tournaments & Leagues](https://www.dupr.com/post/pickleball-tournaments-leagues-explained-your-guide-to-competitive-play)
- [DUPR App Store](https://apps.apple.com/us/app/dupr/id1567932355)
- [UTR Sports — tennis rating](https://www.utrsports.net/)
- [UTR App Store](https://apps.apple.com/us/app/utr-sports/id1519232627)
- [Universal Tennis Rating Wikipedia](https://en.wikipedia.org/wiki/Universal_Tennis_Rating)
- [Rankat — friend ELO leaderboards](https://www.rankat.app/)
- [Elovation GitHub](https://github.com/elovation/elovation)
- [Strava Clubs](https://support.strava.com/hc/en-us/articles/216918347-Clubs-on-Strava)
- [Hevy Leaderboards](https://www.hevyapp.com/features/gym-leaderboard/)
- [Swish Pickleball App](https://www.pickletip.com/swish-pickleball-app/)

## Funding / industry intelligence
- [Epic Padel $10M seed — Wamda](https://www.wamda.com/2025/09/epic-padel-secures-10-million-launch-global-padel-ventures)
- [Epic Padel Investments page](https://www.epic-padel.com/investments)
- [Pro Padel League funding — Startup Intros](https://startupintros.com/orgs/pro-padel-league)
- [Sports tech funding 2025 — TMTPost](https://en.tmtpost.com/post/7717175)
- [Sports tech investment trends — Dakota.com](https://www.dakota.com/resources/blog/where-the-money-swings-10-trends-powering-the-next-wave-of-sports-investing)
- [Funded sports startups 2026 — GrowthList](https://growthlist.co/list-of-funded-sports-startups/)
- [Racket Sports Tech August 2025](https://racketbusiness.com/p/racket-sports-tech-for-august-2025-86eb0f6017bf7d36)

## FIP / federation
- [FIP Beyond launch — Padel FIP](https://www.padelfip.com/2025/12/fip-beyond-is-born-the-new-global-tour-dedicated-to-amateur-padel/)
- [FIP Beyond detail — The Padel Paper](https://thepadelpaper.com/fip-beyond-amateur-padel-circuit/)
- [FIP Beyond conditions — Actu Padel](https://actu-padel.com/en/fip-beyond-amateur-padel-goes-global-but-under-what-conditions/)
- [FIP Ranking System — Padel FIP](https://www.padelfip.com/ranking-system-points-breakdown/)
- [Federazione Italiana Tennis e Padel](https://www.fitp.it/)
- [World Padel Rating amateur platform](https://worldpadelrating.com/)

## SaaS / monetization references
- [Sports App Monetization Models 2026 — SportsFirst](https://www.sportsfirst.net/post/sports-app-monetization-models-that-actually-work)
- [Why 95% of Micro-SaaS Startups Fail — Medium 2025](https://thezubairusman.medium.com/why-95-of-micro-saas-startups-fail-and-how-solo-founders-can-win-in-2025-a971594a9134)
- [11 App Pricing Models 2026 — FunnelFox](https://blog.funnelfox.com/app-pricing-models-guide/)
- [Mobile App Monetization 2026 — AppsFinboard](https://appsfinboard.com/blog/mobile-app-monetization-strategies-2026/)
- [Supabase Pricing 2026 — UI Bakery](https://uibakery.io/blog/supabase-pricing)

---

*Documento prodotto da Claude (deep-research framework) + curato da Andrea. Phase 1 completa. Phase 2 (interviste umane + focus group) da pianificare separatamente.*
