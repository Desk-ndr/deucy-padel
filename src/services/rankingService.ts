import { supabase } from '@/integrations/supabase/client';
import { BlitzTournamentData, BlitzBet, BlitzRound } from './blitzService';

// ── Constants ──

const PLACEMENT_POINTS: Record<number, number> = { 1: 50, 2: 35, 3: 22, 4: 12, 5: 5 };
const BETTING_BONUS: Record<number, number> = { 1: 8, 2: 5, 3: 3, 4: 1, 5: 0 };
const WINDOW_SIZE = 6;
const BEST_OF = 4;

// ── Types ──

export interface RankedPlayer {
  playerId: string;
  displayName: string;
  phone: string;
  rankingScore: number;
  tournamentsPlayed: number;
  bestResults: number[];
  isCrownHolder: boolean;
  consecutiveWins: number;
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
  createdAt: string;
}

// ── Finalize: called when tournament ends ──

export async function finalizeRanking(
  tournament: BlitzTournamentData,
  rounds: BlitzRound[],
  bets: BlitzBet[]
) {
  // 1. Calculate games won per player
  const gamesWon: number[] = tournament.players.map(() => 0);
  const completedRounds = rounds.filter(r => r.status === 'completed' && r.team_a_score !== null);

  for (const round of completedRounds) {
    const schedule = tournament.schedule[round.round_index];
    if (!schedule) continue;
    const scoreA = round.team_a_score!;
    const scoreB = round.team_b_score!;
    if (scoreA > scoreB) {
      schedule.teamA.forEach(i => { gamesWon[i]++; });
    } else if (scoreB > scoreA) {
      schedule.teamB.forEach(i => { gamesWon[i]++; });
    }
  }

  // 2. Calculate betting profit per player
  const betProfit: number[] = tournament.players.map(() => 0);
  const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost');
  for (const bet of settledBets) {
    if (bet.status === 'won') betProfit[bet.bettor_index] += bet.stake;
    else if (bet.status === 'lost') betProfit[bet.bettor_index] -= bet.stake;
  }

  // 3. Sort by gamesWon → placement
  const playerIndices = tournament.players.map((_, i) => i);
  const sortedByGames = [...playerIndices].sort((a, b) => gamesWon[b] - gamesWon[a]);
  const gamePlacement: number[] = new Array(tournament.players.length);
  sortedByGames.forEach((playerIdx, rank) => { gamePlacement[playerIdx] = rank + 1; });

  // 4. Sort by betProfit → betting placement
  const sortedByBets = [...playerIndices].sort((a, b) => betProfit[b] - betProfit[a]);
  const betPlacement: number[] = new Array(tournament.players.length);
  sortedByBets.forEach((playerIdx, rank) => { betPlacement[playerIdx] = rank + 1; });

  // 5. Get authenticated player mapping (tournament player index → player_id)
  // For now, we need a way to link tournament players to auth players.
  // We'll use phone number stored in tournament.players (to be added) or match by name.
  // This requires the tournament to store player_id in the players JSON.
  
  const entries: Array<{
    player_id: string;
    tournament_id: string;
    placement: number;
    placement_points: number;
    betting_placement: number;
    betting_bonus: number;
    total_points: number;
  }> = [];

  for (let i = 0; i < tournament.players.length; i++) {
    const player = tournament.players[i] as any;
    // Skip if no linked player_id (guest/unauth player)
    if (!player.player_id) continue;

    const placement = gamePlacement[i];
    const placementPts = PLACEMENT_POINTS[Math.min(placement, 5)] || 0;
    const bettingPl = betPlacement[i];
    const bettingBon = BETTING_BONUS[Math.min(bettingPl, 5)] || 0;

    entries.push({
      player_id: player.player_id,
      tournament_id: tournament.id,
      placement,
      placement_points: placementPts,
      betting_placement: bettingPl,
      betting_bonus: bettingBon,
      total_points: placementPts + bettingBon,
    });
  }

  if (entries.length === 0) return { error: 'No authenticated players to rank' };

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

// ── Get global ranking (best 4 of last 6) ──

export async function getRanking(): Promise<{ data: RankedPlayer[]; error: string | null }> {
  // Fetch all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, display_name, phone, crown_holder, consecutive_wins');
  if (playersError) return { data: [], error: playersError.message };

  // Fetch ranking entries (last WINDOW_SIZE tournaments per player)
  const { data: allEntries, error: entriesError } = await supabase
    .from('ranking_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (entriesError) return { data: [], error: entriesError.message };

  // Group entries by player
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
      createdAt: entry.created_at,
    });
  }

  // Calculate ranking for each player
  const ranked: RankedPlayer[] = (players || []).map(player => {
    const entries = (playerEntries[player.id] || []).slice(0, WINDOW_SIZE);
    const sorted = entries.map(e => e.totalPoints).sort((a, b) => b - a);
    const best = sorted.slice(0, BEST_OF);
    const score = best.reduce((sum, pts) => sum + pts, 0);

    return {
      playerId: player.id,
      displayName: player.display_name,
      phone: player.phone,
      rankingScore: score,
      tournamentsPlayed: entries.length,
      bestResults: best,
      isCrownHolder: player.crown_holder,
      consecutiveWins: player.consecutive_wins,
    };
  }).filter(p => p.tournamentsPlayed > 0);

  // Sort by ranking score
  ranked.sort((a, b) => b.rankingScore - a.rankingScore);

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
      createdAt: entry.created_at,
    })),
    error: null,
  };
}
