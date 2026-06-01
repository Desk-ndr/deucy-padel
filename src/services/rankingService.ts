import { supabase } from '@/integrations/supabase/client';
import { BlitzTournamentData, BlitzBet, BlitzRound } from './blitzService';

// ── Constants ──

const PLACEMENT_POINTS: Record<number, number> = { 1: 50, 2: 35, 3: 22, 4: 12, 5: 5 };
const BETTING_BONUS: Record<number, number> = { 1: 8, 2: 5, 3: 3, 4: 1, 5: 0 };

// Two-month weighted decay. Weight = 1.0 for entries played in the
// current calendar month, 0.7 in the previous month, 0 beyond. This
// replaces the old "best 4 of last 6" rule. Rationale: rewards recent
// activity (so people show up to play) without the cliff-edge feel of
// hard-truncating to N tournaments.
//
// Examples (now = 2026-05-10):
//   entry on 2026-05-04  → diff = 0 months → weight 1.0
//   entry on 2026-04-22  → diff = 1 month  → weight 0.7
//   entry on 2026-03-30  → diff = 2 months → weight 0 (drops out)
function decayWeight(entryIso: string, now: Date = new Date()): number {
  const d = new Date(entryIso);
  if (isNaN(d.getTime())) return 0;
  const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (monthDiff <= 0) return 1.0;
  if (monthDiff === 1) return 0.7;
  return 0;
}

// Kept so BlitzRanking expanded view can still cap the "best results"
// block to a sane number of rows.
const MAX_BEST_RESULTS_DISPLAYED = 6;

// ── Types ──

export interface BestResult {
  points: number;       // raw placement+betting points
  weight: number;       // decay weight (1.0 / 0.7 / 0)
  weightedPoints: number; // points × weight, rounded
  date: string;         // ISO from ranking_entries.created_at
  tournamentName: string;
  tournamentId: string;
}

// Head-to-head rivalry tracking. For each player we surface their record
// against the player ranked immediately above them ("the rival to catch").
// For #1 we surface their record against #2 ("the contender chasing").
//
// "Win" = finished above the rival in a shared tournament. "Loss" =
// finished below. Ties (shared placement) are excluded from the streak
// count to avoid noise.
export interface Rivalry {
  rivalId: string;
  rivalName: string;
  wins: number;          // total tournaments where you placed above the rival
  losses: number;        // total tournaments where you placed below
  shared: number;        // total tournaments where both played
  streakType: 'W' | 'L' | null; // sign of the most recent decisive matchup
  streakCount: number;          // consecutive same-type results, most recent first
}

export interface RankedPlayer {
  playerId: string;
  displayName: string;
  phone: string;
  rankingScore: number;
  tournamentsPlayed: number;   // total all-time, not in-window
  bestResults: BestResult[];
  isCrownHolder: boolean;
  consecutiveWins: number;
  lastTournamentPoints: number | null; // points from latest tournament
  pointsDelta: number | null;          // change vs previous ranking score
  winRate: number;                     // % of matches won across all tournaments
  form: 'hot' | 'up' | 'down' | 'stable' | 'new'; // trend from last 3 tournaments
  rivalry: Rivalry | null;             // H2H vs the player adjacent in ranking
}

export interface RankingEntry {
  id: string;
  playerId: string;
  tournamentId: string;
  placement: number;
  placementPoints: number;
  bettingPlacement: number | null;
  bettingBonus: number;
  totalPoints: number;
  gamesWon: number;
  gamesPlayed: number;
  createdAt: string;
}

// ── Finalize: called when tournament ends ──

export async function finalizeRanking(
  tournament: BlitzTournamentData,
  _rounds?: BlitzRound[],
  _bets?: BlitzBet[]
) {
  // Fetch fresh data from Supabase (local state may be stale after last submitScore)
  const { data: freshRounds } = await supabase
    .from('blitz_rounds')
    .select('*')
    .eq('tournament_id', tournament.id)
    .order('round_index');
  const { data: freshBets } = await supabase
    .from('blitz_bets')
    .select('*')
    .eq('tournament_id', tournament.id);

  const rounds: BlitzRound[] = (freshRounds || []) as any;
  const bets: BlitzBet[] = (freshBets || []) as any;

  // 1. Calculate games won (for placement) + matches won/played (for W%)
  const gamesWon: number[] = tournament.players.map(() => 0);
  const matchesWon: number[] = tournament.players.map(() => 0);
  const matchesPlayed: number[] = tournament.players.map(() => 0);
  const completedRounds = rounds.filter(r => r.status === 'completed' && r.team_a_score !== null);

  for (const round of completedRounds) {
    const schedule = tournament.schedule[round.round_index - 1];
    if (!schedule) continue;
    const scoreA = round.team_a_score!;
    const scoreB = round.team_b_score!;
    // Games won (for placement ranking)
    schedule.teamA.forEach(i => { gamesWon[i] += scoreA; });
    schedule.teamB.forEach(i => { gamesWon[i] += scoreB; });
    // Matches won/played (for W%) — draw = 0.5 each
    const aWon = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
    const bWon = scoreB > scoreA ? 1 : scoreA === scoreB ? 0.5 : 0;
    schedule.teamA.forEach(i => { matchesWon[i] += aWon; matchesPlayed[i] += 1; });
    schedule.teamB.forEach(i => { matchesWon[i] += bWon; matchesPlayed[i] += 1; });
  }

  // 2. Calculate betting profit per player
  const betProfit: number[] = tournament.players.map(() => 0);
  const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost');
  for (const bet of settledBets) {
    if (bet.status === 'won') betProfit[bet.bettor_index] += bet.stake;
    else if (bet.status === 'lost') betProfit[bet.bettor_index] -= bet.stake;
  }

  // 3. Sort by matchesWon desc → gamesWon tiebreak → shared placement if both equal
  const playerIndices = tournament.players.map((_, i) => i);
  const sortedByGames = [...playerIndices].sort((a, b) => {
    if (matchesWon[b] !== matchesWon[a]) return matchesWon[b] - matchesWon[a];
    return gamesWon[b] - gamesWon[a];
  });
  const gamePlacement: number[] = new Array(tournament.players.length);
  sortedByGames.forEach((playerIdx, sortPos) => {
    if (sortPos === 0) {
      gamePlacement[playerIdx] = 1;
    } else {
      const prevIdx = sortedByGames[sortPos - 1];
      // Shared placement if same matchesWon AND same gamesWon
      if (matchesWon[playerIdx] === matchesWon[prevIdx] && gamesWon[playerIdx] === gamesWon[prevIdx]) {
        gamePlacement[playerIdx] = gamePlacement[prevIdx];
      } else {
        gamePlacement[playerIdx] = sortPos + 1;
      }
    }
  });

  // 4. Sort by betProfit → betting placement
  // Track which players actually placed bets
  const playerHasBets: boolean[] = tournament.players.map(() => false);
  for (const bet of bets) {
    playerHasBets[bet.bettor_index] = true;
  }
  const sortedByBets = [...playerIndices].sort((a, b) => betProfit[b] - betProfit[a]);
  const betPlacement: number[] = new Array(tournament.players.length);
  sortedByBets.forEach((playerIdx, sortPos) => {
    if (sortPos === 0) {
      betPlacement[playerIdx] = 1;
    } else {
      const prevIdx = sortedByBets[sortPos - 1];
      if (betProfit[playerIdx] === betProfit[prevIdx]) {
        betPlacement[playerIdx] = betPlacement[prevIdx];
      } else {
        betPlacement[playerIdx] = sortPos + 1;
      }
    }
  });

  // 5. Resolve player_id for each tournament player
  // If player_id is stored in the JSON, use it. Otherwise, match by display_name.
  const { data: allPlayers } = await supabase.from('players').select('id, display_name');
  const nameToId: Record<string, string> = {};
  for (const p of (allPlayers || [])) {
    nameToId[p.display_name.toLowerCase()] = p.id;
  }

  const entries: Array<{
    player_id: string;
    tournament_id: string;
    placement: number;
    placement_points: number;
    betting_placement: number;
    betting_bonus: number;
    total_points: number;
    games_won: number;
    games_played: number;
  }> = [];

  for (let i = 0; i < tournament.players.length; i++) {
    const player = tournament.players[i] as any;
    // Guest players never get a ranking entry. They appear in the
    // tournament leaderboard but stay out of the global ranking — Andrea
    // can let an outsider play one Saturday without polluting the
    // long-term pool. Explicit flag (not "player_id is null"), so that
    // legacy tournaments without player_id can still resolve via name.
    if (player.isGuest) continue;
    // Resolve player_id: direct link OR fallback to name match
    const resolvedId = player.player_id || nameToId[player.name.toLowerCase()] || null;
    if (!resolvedId) continue;

    const placement = gamePlacement[i];
    const placementPts = PLACEMENT_POINTS[placement] || 0;
    const bettingPl = betPlacement[i];
    const bettingBon = playerHasBets[i] ? (BETTING_BONUS[bettingPl] || 0) : 0;

    entries.push({
      player_id: resolvedId,
      tournament_id: tournament.id,
      placement,
      placement_points: placementPts,
      betting_placement: bettingPl,
      betting_bonus: bettingBon,
      total_points: placementPts + bettingBon,
      games_won: gamesWon[i],
      games_played: completedRounds.filter(r => { const s = tournament.schedule[r.round_index - 1]; return s && (s.teamA.includes(i) || s.teamB.includes(i)); }).length,
    });
  }

  if (entries.length === 0) return { error: 'No players could be matched to ranking' };

  // 6. Insert ranking entries
  const { error: insertError } = await supabase.from('ranking_entries').upsert(entries, {
    onConflict: 'player_id,tournament_id',
  });
  if (insertError) return { error: insertError.message };

  // 7. Update crown holder
  const winnerId = entries.find(e => e.placement === 1)?.player_id;
  if (winnerId) {
    // Remove crown from previous holder
    await supabase.from('players').update({ crown_holder: false, crown_since: null }).eq('crown_holder', true);
    
    // Check consecutive wins
    const { data: recentEntries } = await supabase
      .from('ranking_entries')
      .select('placement')
      .eq('player_id', winnerId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    let consecutive = 0;
    for (const entry of (recentEntries || [])) {
      if (entry.placement === 1) consecutive++;
      else break;
    }

    // Set new crown holder
    await supabase.from('players').update({
      crown_holder: true,
      crown_since: new Date().toISOString(),
      consecutive_wins: consecutive,
    }).eq('id', winnerId);
  }

  return { error: null };
}

// ── Get global ranking (two-month weighted decay + H2H rivalry) ──

export async function getRanking(): Promise<{ data: RankedPlayer[]; error: string | null }> {
  // Fetch all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, display_name, phone, crown_holder, consecutive_wins');
  if (playersError) return { data: [], error: playersError.message };

  // Fetch ALL ranking entries — we need full history for H2H even though
  // ranking math only counts the last 2 months. Volume is small.
  const { data: allEntries, error: entriesError } = await supabase
    .from('ranking_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (entriesError) return { data: [], error: entriesError.message };

  // Fetch tournament names once for the bestResults enrichment.
  const allTournamentIds = [...new Set((allEntries || []).map(e => e.tournament_id))];
  const tournamentNamesMap: Record<string, string> = {};
  if (allTournamentIds.length > 0) {
    const { data: tNamesRows } = await supabase
      .from('blitz_tournaments')
      .select('id, name')
      .in('id', allTournamentIds);
    for (const t of (tNamesRows || [])) {
      tournamentNamesMap[t.id] = t.name;
    }
  }

  // Group entries by player (sorted: most recent first)
  const playerEntries: Record<string, RankingEntry[]> = {};
  for (const entry of (allEntries || [])) {
    const pid = entry.player_id;
    if (!playerEntries[pid]) playerEntries[pid] = [];
    playerEntries[pid].push({
      id: entry.id,
      playerId: entry.player_id,
      tournamentId: entry.tournament_id,
      placement: entry.placement,
      placementPoints: entry.placement_points,
      bettingPlacement: entry.betting_placement,
      bettingBonus: entry.betting_bonus,
      totalPoints: entry.total_points,
      gamesWon: entry.games_won || 0,
      gamesPlayed: entry.games_played || 0,
      createdAt: entry.created_at,
    });
  }

  const now = new Date();

  // Weighted-decay score: sum of (totalPoints × decayWeight) across all
  // entries. Old entries contribute 0 and silently drop out.
  const computeWeightedScore = (entries: RankingEntry[]): number => {
    let s = 0;
    for (const e of entries) s += e.totalPoints * decayWeight(e.createdAt, now);
    return Math.round(s);
  };

  const ranked: RankedPlayer[] = (players || []).map(player => {
    const entries = playerEntries[player.id] || []; // all-time, recent first
    const score = computeWeightedScore(entries);

    // Delta = current score minus what the score WOULD have been without
    // the latest entry. With decay this can change as time passes (an
    // entry weight drops from 1.0 → 0.7 across a month boundary) but
    // here we measure the impact of the most-recent finished tournament.
    const latestEntry = entries[0];
    let pointsDelta: number | null = null;
    let lastTournamentPoints: number | null = null;
    if (latestEntry) {
      lastTournamentPoints = latestEntry.totalPoints;
      const prevScore = computeWeightedScore(entries.slice(1));
      pointsDelta = score - prevScore;
    }

    const winRate = 0; // recalculated below from rounds

    // Form: trend across last 3 tournaments by placement (unchanged)
    let form: 'hot' | 'up' | 'down' | 'stable' | 'new' = 'new';
    const recent = entries.slice(0, 3).map(e => e.placement);
    if (recent.length >= 3) {
      const allTop2 = recent.every(p => p <= 2);
      if (allTop2) form = 'hot';
      else if (recent[0] < recent[2]) form = 'up';
      else if (recent[0] > recent[2]) form = 'down';
      else form = 'stable';
    } else if (recent.length === 2) {
      form = recent[0] <= recent[1] ? 'up' : 'down';
    }

    // Best results: show entries that contribute to the score (weight > 0),
    // ordered by weighted points desc. Cap to keep the expanded card clean.
    const inWindow = entries
      .map(e => {
        const w = decayWeight(e.createdAt, now);
        return { entry: e, weight: w, weighted: Math.round(e.totalPoints * w) };
      })
      .filter(x => x.weight > 0)
      .sort((a, b) => b.weighted - a.weighted)
      .slice(0, MAX_BEST_RESULTS_DISPLAYED);

    const bestResultsEnriched: BestResult[] = inWindow.map(x => ({
      points: x.entry.totalPoints,
      weight: x.weight,
      weightedPoints: x.weighted,
      date: x.entry.createdAt,
      tournamentId: x.entry.tournamentId,
      tournamentName: tournamentNamesMap[x.entry.tournamentId] || 'Tournament',
    }));

    return {
      playerId: player.id,
      displayName: player.display_name,
      phone: player.phone,
      rankingScore: score,
      tournamentsPlayed: entries.length,    // career total
      bestResults: bestResultsEnriched,
      isCrownHolder: player.crown_holder,
      consecutiveWins: player.consecutive_wins,
      lastTournamentPoints,
      pointsDelta,
      winRate,
      form,
      rivalry: null, // populated below after sort
    };
  });

  // Sort: by rankingScore desc, then by displayName asc as a deterministic
  // tiebreaker. Players who haven't played yet share rankingScore=0 and
  // get listed alphabetically — no longer hidden, so the home page shows
  // the full pool even before the first tournament.
  ranked.sort((a, b) => {
    if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
    return a.displayName.localeCompare(b.displayName);
  });

  // ── Dynamic W% calculation from actual round data ──
  // Get all tournament IDs referenced in ranking entries
  const tournamentIds = [...new Set((allEntries || []).map(e => e.tournament_id))];
  
  if (tournamentIds.length > 0) {
    // Fetch all tournaments and their rounds
    const { data: tournaments } = await supabase
      .from('blitz_tournaments')
      .select('id, players, schedule')
      .in('id', tournamentIds);
    
    const { data: allRounds } = await supabase
      .from('blitz_rounds')
      .select('tournament_id, round_index, team_a_score, team_b_score, status')
      .in('tournament_id', tournamentIds)
      .eq('status', 'completed');

    // Build a map: playerId → { matchesWon, matchesPlayed }
    const matchStats: Record<string, { won: number; played: number }> = {};

    for (const t of (tournaments || [])) {
      const tRounds = (allRounds || []).filter(r => r.tournament_id === t.id && r.team_a_score !== null);
      const tPlayers: Array<{ name: string; player_id?: string }> = t.players || [];

      // Build playerIndex → playerId map for this tournament
      const indexToId: Record<number, string> = {};
      for (let i = 0; i < tPlayers.length; i++) {
        const pid = tPlayers[i].player_id;
        if (pid) {
          indexToId[i] = pid;
        } else {
          // Fallback: match by name
          const found = (players || []).find(
            p => p.display_name.toLowerCase() === tPlayers[i].name.toLowerCase()
          );
          if (found) indexToId[i] = found.id;
        }
      }

      for (const round of tRounds) {
        const sched = (t.schedule || [])[round.round_index - 1];
        if (!sched) continue;
        const aWon = round.team_a_score > round.team_b_score ? 1 : round.team_a_score === round.team_b_score ? 0.5 : 0;
        const bWon = round.team_b_score > round.team_a_score ? 1 : round.team_b_score === round.team_a_score ? 0.5 : 0;
        for (const idx of (sched.teamA || [])) {
          const pid = indexToId[idx];
          if (!pid) continue;
          if (!matchStats[pid]) matchStats[pid] = { won: 0, played: 0 };
          matchStats[pid].won += aWon;
          matchStats[pid].played += 1;
        }
        for (const idx of (sched.teamB || [])) {
          const pid = indexToId[idx];
          if (!pid) continue;
          if (!matchStats[pid]) matchStats[pid] = { won: 0, played: 0 };
          matchStats[pid].won += bWon;
          matchStats[pid].played += 1;
        }
      }
    }

    // Apply dynamic W% to ranked players
    for (const p of ranked) {
      const stats = matchStats[p.playerId];
      if (stats && stats.played > 0) {
        (p as any).winRate = Math.round((stats.won / stats.played) * 100);
      }
    }
  }

  // Sort by ranking score
  ranked.sort((a, b) => b.rankingScore - a.rankingScore);

  // ── H2H rivalry ──
  // For each player, the "rival" is the player ranked one position above
  // (the one to catch). For #1 the rival is #2 (the one chasing).
  // We compute wins / losses / current streak based on shared tournaments.
  const idToName: Record<string, string> = {};
  for (const p of ranked) idToName[p.playerId] = p.displayName;

  for (let i = 0; i < ranked.length; i++) {
    const me = ranked[i];
    const rival = i === 0 ? ranked[1] : ranked[i - 1];
    if (!rival || rival.playerId === me.playerId) continue;

    const myEntries = playerEntries[me.playerId] || [];
    const rivalEntriesByTid: Record<string, RankingEntry> = {};
    for (const e of (playerEntries[rival.playerId] || [])) {
      rivalEntriesByTid[e.tournamentId] = e;
    }

    // Walk shared tournaments most-recent first (myEntries already is).
    // A "win" = my placement < rival's (lower is better). Tied placements
    // are skipped from the streak so we don't show "—".
    let wins = 0, losses = 0, shared = 0;
    let streakType: 'W' | 'L' | null = null;
    let streakCount = 0;
    let streakLocked = false;

    for (const myE of myEntries) {
      const rE = rivalEntriesByTid[myE.tournamentId];
      if (!rE) continue;
      shared++;
      if (myE.placement < rE.placement) {
        wins++;
        if (!streakLocked) {
          if (streakType === 'W' || streakType === null) {
            streakType = 'W'; streakCount++;
          } else streakLocked = true;
        }
      } else if (myE.placement > rE.placement) {
        losses++;
        if (!streakLocked) {
          if (streakType === 'L' || streakType === null) {
            streakType = 'L'; streakCount++;
          } else streakLocked = true;
        }
      }
      // tie: counted in shared, skipped from W/L tally and streak
    }

    me.rivalry = shared > 0 ? {
      rivalId: rival.playerId,
      rivalName: rival.displayName,
      wins, losses, shared,
      streakType,
      streakCount,
    } : null;
  }

  return { data: ranked, error: null };
}

// ── Get crown holder ──

export async function getCrownHolder(): Promise<{ data: RankedPlayer | null; error: string | null }> {
  const { data: ranked, error } = await getRanking();
  if (error) return { data: null, error };
  const crown = ranked.find(p => p.isCrownHolder);
  return { data: crown || null, error: null };
}

// ── Get player history ──

export async function getPlayerHistory(playerId: string): Promise<{ data: RankingEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from('ranking_entries')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  return {
    data: (data || []).map(entry => ({
      id: entry.id,
      playerId: entry.player_id,
      tournamentId: entry.tournament_id,
      placement: entry.placement,
      placementPoints: entry.placement_points,
      bettingPlacement: entry.betting_placement,
      bettingBonus: entry.betting_bonus,
      totalPoints: entry.total_points,
      gamesWon: entry.games_won || 0,
      gamesPlayed: entry.games_played || 0,
      createdAt: entry.created_at,
    })),
    error: null,
  };
}
