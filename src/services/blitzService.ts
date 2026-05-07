import { supabase } from '@/integrations/supabase/client';
import { BlitzRoundSchedule, EUROS_PER_GAME } from '@/lib/blitz-schedule';

// ── Types ──

export interface BlitzPlayer { name: string; balance: number; }

export interface BlitzRound {
  id: string; round_index: number; team_a_score: number | null;
  team_b_score: number | null; status: string;
}

export interface BlitzBet {
  id: string; round_index: number; bettor_index: number;
  predicted_winner: string; status: string; stake: number;
  created_at?: string;
}

export interface BlitzTournamentData {
  id: string; name: string; status: string; players: BlitzPlayer[];
  current_round: number; total_rounds: number; round_duration_seconds: number;
  schedule: BlitzRoundSchedule[]; timer_started_at: string | null;
  timer_paused_remaining: number | null; created_by: string | null;
  finished_at: string | null;
}

// 10-minute window after a tournament finishes during which scores
// can still be edited. After that the data is locked.
export const EDIT_WINDOW_MS = 10 * 60 * 1000;

// ── Helpers ──

function parseTournament(raw: any): BlitzTournamentData {
  return {
    ...raw,
    players: (raw.players as any[] || []).map((p: any) => ({
      name: p.name, balance: p.balance ?? p.score ?? 0,
    })),
    schedule: (raw.schedule as any[] || []) as BlitzRoundSchedule[],
  };
}

// ── Queries ──

export async function getTournament(id: string) {
  const { data, error } = await supabase.from('blitz_tournaments').select('*').eq('id', id).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: parseTournament(data), error: null };
}

export async function listTournaments() {
  const { data, error } = await supabase.from('blitz_tournaments').select('*').order('created_at', { ascending: false });
  if (error) return { data: [] as BlitzTournamentData[], error: error.message };
  return { data: (data || []).map(parseTournament), error: null };
}

export async function getRounds(tournamentId: string) {
  const { data, error } = await supabase.from('blitz_rounds').select('*').eq('tournament_id', tournamentId).order('round_index');
  if (error) return { data: [] as BlitzRound[], error: error.message };
  return { data: (data || []) as BlitzRound[], error: null };
}

export async function getBets(tournamentId: string) {
  const { data, error } = await supabase.from('blitz_bets').select('*').eq('tournament_id', tournamentId).order('created_at');
  if (error) return { data: [] as BlitzBet[], error: error.message };
  return { data: (data || []) as BlitzBet[], error: null };
}

// ── Realtime ──

export function subscribeTournament(id: string, callback: (t: BlitzTournamentData) => void) {
  const channel = supabase
    .channel(`blitz-tournament-${id}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'blitz_tournaments', filter: `id=eq.${id}`,
    }, (payload) => { callback(parseTournament(payload.new)); })
    .subscribe();
  return channel;
}

export function subscribeBets(tournamentId: string, callback: () => void) {
  const channel = supabase
    .channel(`blitz-bets-${tournamentId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'blitz_bets', filter: `tournament_id=eq.${tournamentId}`,
    }, () => { callback(); })
    .subscribe();
  return channel;
}

export function subscribeRounds(tournamentId: string, callback: () => void) {
  const channel = supabase
    .channel(`blitz-rounds-${tournamentId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'blitz_rounds', filter: `tournament_id=eq.${tournamentId}`,
    }, () => { callback(); })
    .subscribe();
  return channel;
}

/**
 * Subscribe to ALL changes on the blitz_tournaments table (INSERT,
 * UPDATE, DELETE). Used by the home page (BlitzList) so that when
 * any user creates a new tournament, advances a tournament from
 * setup to live, finishes it, or deletes it, every other connected
 * device sees the change within ~500ms — no manual refresh needed.
 */
export function subscribeAllTournaments(callback: () => void) {
  const channel = supabase
    .channel('blitz-tournaments-all')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'blitz_tournaments',
    }, () => { callback(); })
    .subscribe();
  return channel;
}

// ── Mutations ──

export async function createTournament(name: string, createdBy: string) {
  const { data, error } = await supabase.from('blitz_tournaments')
    .insert({ name: name.trim(), created_by: createdBy } as any).select().single();
  if (error) return { data: null, error: error.message };
  return { data: parseTournament(data), error: null };
}

export async function deleteTournament(id: string) {
  // ranking_entries are CASCADE-deleted automatically via FK
  await supabase.from('blitz_bets').delete().eq('tournament_id', id);
  await supabase.from('blitz_rounds').delete().eq('tournament_id', id);
  await supabase.from('blitz_pledges').delete().eq('tournament_id', id);
  const { error } = await supabase.from('blitz_tournaments').delete().eq('id', id);
  if (error) return { error: error.message };

  // Recalculate crown: find player with most recent 1st place
  await supabase.from('players').update({ crown_holder: false, crown_since: null, consecutive_wins: 0 }).eq('crown_holder', true);
  const { data: latestWin } = await supabase
    .from('ranking_entries')
    .select('player_id')
    .eq('placement', 1)
    .order('created_at', { ascending: false })
    .limit(1);
  if (latestWin && latestWin.length > 0) {
    const winnerId = latestWin[0].player_id;
    // Count consecutive wins
    const { data: recentEntries } = await supabase
      .from('ranking_entries')
      .select('placement')
      .eq('player_id', winnerId)
      .order('created_at', { ascending: false })
      .limit(10);
    let consecutive = 0;
    for (const e of (recentEntries || [])) {
      if (e.placement === 1) consecutive++;
      else break;
    }
    await supabase.from('players').update({
      crown_holder: true,
      crown_since: new Date().toISOString(),
      consecutive_wins: consecutive,
    }).eq('id', winnerId);
  }

  return { error: null };
}

export async function startTournament(
  id: string,
  config: { totalRounds: number; roundDurationSeconds: number },
  players: BlitzPlayer[],
  schedule: BlitzRoundSchedule[],
) {
  const { error: tErr } = await supabase.from('blitz_tournaments').update({
    players: players as any, status: 'live', current_round: 1,
    total_rounds: config.totalRounds, round_duration_seconds: config.roundDurationSeconds,
    schedule: schedule as any,
  } as any).eq('id', id);
  if (tErr) return { error: tErr.message };

  const roundInserts = Array.from({ length: config.totalRounds }, (_, i) => ({
    tournament_id: id, round_index: i + 1, status: i === 0 ? 'active' : 'pending',
  }));
  const { error: rErr } = await supabase.from('blitz_rounds').insert(roundInserts);
  return { error: rErr?.message ?? null };
}

// ── Timer ──

export async function startTimer(id: string, _durationSeconds?: number) {
  const { error } = await supabase.from('blitz_tournaments').update({
    timer_started_at: new Date().toISOString(), timer_paused_remaining: null,
  } as any).eq('id', id);
  return { error: error?.message ?? null };
}

export async function pauseTimer(id: string, remainingSeconds: number) {
  const { error } = await supabase.from('blitz_tournaments').update({
    timer_started_at: null, timer_paused_remaining: remainingSeconds,
  } as any).eq('id', id);
  return { error: error?.message ?? null };
}

export async function resetTimer(id: string, durationSeconds: number) {
  const { error } = await supabase.from('blitz_tournaments').update({
    timer_started_at: null, timer_paused_remaining: durationSeconds,
  } as any).eq('id', id);
  return { error: error?.message ?? null };
}

// ── Score & Bets ──

export async function submitScore(
  id: string, roundId: string, roundIndex: number,
  scoreA: number, scoreB: number,
  tournament: BlitzTournamentData, bets: BlitzBet[],
) {
  // 1. Complete the round — compare-and-swap on status to prevent
  // double-submission when multiple players hit Submit simultaneously.
  // Only the first request finds status='active' and succeeds; the second
  // matches zero rows and we return ALREADY_COMPLETED, which the UI shows
  // as a soft toast instead of crashing.
  const { data: updatedRound, error: rErr } = await supabase.from('blitz_rounds')
    .update({ team_a_score: scoreA, team_b_score: scoreB, status: 'completed' })
    .eq('id', roundId)
    .eq('status', 'active')
    .select('id');
  if (rErr) return { error: rErr.message };
  if (!updatedRound || updatedRound.length === 0) {
    return { error: 'ALREADY_COMPLETED' };
  }

  // 2. Calculate new balances
  const updatedPlayers = [...tournament.players];
  const schedule = tournament.schedule[roundIndex - 1];
  if (schedule) {
    schedule.teamA.forEach(idx => {
      updatedPlayers[idx] = { ...updatedPlayers[idx], balance: updatedPlayers[idx].balance + scoreA * EUROS_PER_GAME };
    });
    schedule.teamB.forEach(idx => {
      updatedPlayers[idx] = { ...updatedPlayers[idx], balance: updatedPlayers[idx].balance + scoreB * EUROS_PER_GAME };
    });
  }

  // 3. Settle bets
  const roundBets = bets.filter(b => b.round_index === roundIndex && b.status === 'pending');
  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'draw';
  for (const bet of roundBets) {
    if (winner === 'draw') {
      updatedPlayers[bet.bettor_index] = {
        ...updatedPlayers[bet.bettor_index],
        balance: updatedPlayers[bet.bettor_index].balance + bet.stake,
      };
      await supabase.from('blitz_bets').update({ status: 'draw' }).eq('id', bet.id);
    } else if (bet.predicted_winner === winner) {
      updatedPlayers[bet.bettor_index] = {
        ...updatedPlayers[bet.bettor_index],
        balance: updatedPlayers[bet.bettor_index].balance + bet.stake * 2,
      };
      await supabase.from('blitz_bets').update({ status: 'won' }).eq('id', bet.id);
    } else {
      await supabase.from('blitz_bets').update({ status: 'lost' }).eq('id', bet.id);
    }
  }

  // 4. Advance or finish
  const isLast = roundIndex >= tournament.total_rounds;
  if (isLast) {
    const { error } = await supabase.from('blitz_tournaments').update({
      players: updatedPlayers as any, current_round: roundIndex,
      status: 'finished',
      finished_at: new Date().toISOString(),  // start the 10-min edit window
      timer_started_at: null, timer_paused_remaining: null,
    } as any).eq('id', id);
    return { error: error?.message ?? null };
  }

  const { data: nextRound } = await supabase.from('blitz_rounds').select('id')
    .eq('tournament_id', id).eq('round_index', roundIndex + 1).maybeSingle();
  if (nextRound) await supabase.from('blitz_rounds').update({ status: 'active' }).eq('id', nextRound.id);

  const { error } = await supabase.from('blitz_tournaments').update({
    players: updatedPlayers as any, current_round: roundIndex + 1,
    timer_started_at: null, timer_paused_remaining: null,
  } as any).eq('id', id);
  return { error: error?.message ?? null };
}

export async function placeBet(
  tournamentId: string, roundIndex: number, bettorIndex: number,
  prediction: 'A' | 'B', stake: number, updatedPlayers: BlitzPlayer[],
) {
  const { error: bErr } = await supabase.from('blitz_bets').insert({
    tournament_id: tournamentId, round_index: roundIndex,
    bettor_index: bettorIndex, predicted_winner: prediction, stake,
  });
  if (bErr) return { error: bErr.message };

  const { error: tErr } = await supabase.from('blitz_tournaments')
    .update({ players: updatedPlayers as any } as any).eq('id', tournamentId);
  return { error: tErr?.message ?? null };
}

export async function cancelBet(
  tournamentId: string, betId: string, bettorIndex: number,
  refundStake: number, players: BlitzPlayer[],
) {
  // CAS: only delete if bet is still pending. If the round has already
  // closed (status flipped to won/lost/draw by submitScore), the delete
  // matches zero rows and we surface a soft error so the UI doesn't
  // pretend it succeeded.
  const { data: deleted, error: dErr } = await supabase.from('blitz_bets')
    .delete()
    .eq('id', betId)
    .eq('status', 'pending')
    .select('id');
  if (dErr) return { error: dErr.message };
  if (!deleted || deleted.length === 0) {
    return { error: 'BET_ALREADY_SETTLED' };
  }

  // Refund the stake to the bettor.
  const updatedPlayers = [...players];
  updatedPlayers[bettorIndex] = {
    ...updatedPlayers[bettorIndex],
    balance: updatedPlayers[bettorIndex].balance + refundStake,
  };
  const { error: tErr } = await supabase.from('blitz_tournaments')
    .update({ players: updatedPlayers as any } as any)
    .eq('id', tournamentId);
  return { error: tErr?.message ?? null };
}

export async function resetTournament(id: string, playerNames: string[]) {
  // Check if tournament was finished — if so, clean ranking data
  const { data: tournamentData } = await supabase
    .from('blitz_tournaments').select('status').eq('id', id).single();
  const wasFinished = tournamentData?.status === 'finished';

  await supabase.from('blitz_bets').delete().eq('tournament_id', id);
  await supabase.from('blitz_rounds').delete().eq('tournament_id', id);
  // Always remove ranking entries on reset
  await supabase.from('ranking_entries').delete().eq('tournament_id', id);

  const resetPlayers = playerNames.map(name => ({ name, balance: 10 }));
  const { error } = await supabase.from('blitz_tournaments').update({
    status: 'setup', current_round: 0, players: resetPlayers as any,
    schedule: [] as any, timer_started_at: null, timer_paused_remaining: null,
  } as any).eq('id', id);

  // Recalculate crown holder after removing ranking entries
  {
    await supabase.from('players').update({ crown_holder: false, crown_since: null, consecutive_wins: 0 }).eq('crown_holder', true);
    const { data: latestWinner } = await supabase
      .from('ranking_entries')
      .select('player_id')
      .eq('placement', 1)
      .order('created_at', { ascending: false })
      .limit(1);
    if (latestWinner && latestWinner.length > 0) {
      const winnerId = latestWinner[0].player_id;
      const { data: streak } = await supabase
        .from('ranking_entries')
        .select('placement')
        .eq('player_id', winnerId)
        .order('created_at', { ascending: false })
        .limit(10);
      let consecutive = 0;
      for (const e of (streak || [])) { if (e.placement === 1) consecutive++; else break; }
      await supabase.from('players').update({
        crown_holder: true, crown_since: new Date().toISOString(), consecutive_wins: consecutive,
      }).eq('id', winnerId);
    }
  }

  return { error: error?.message ?? null };
}

export async function editScore(
  id: string, roundId: string, roundIndex: number,
  newScoreA: number, newScoreB: number,
  tournament: BlitzTournamentData, bets: BlitzBet[],
  allRounds: BlitzRound[],
) {
  // 0. Edit window check — once a tournament is finished, scores can
  // be corrected for EDIT_WINDOW_MS (10 minutes). After that the
  // record is locked. Backend gate; the UI hides the edit button
  // independently but this protects against stale clients and direct
  // API calls.
  if (tournament.status === 'finished' && tournament.finished_at) {
    const finishedAt = new Date(tournament.finished_at).getTime();
    if (!isNaN(finishedAt) && Date.now() - finishedAt > EDIT_WINDOW_MS) {
      return { error: 'EDIT_WINDOW_EXPIRED' };
    }
  }

  // 1. Update the round scores
  const { error: rErr } = await supabase.from('blitz_rounds')
    .update({ team_a_score: newScoreA, team_b_score: newScoreB }).eq('id', roundId);
  if (rErr) return { error: rErr.message };

  // 2. Recalculate ALL balances from scratch (starting balance + all completed rounds + all settled bets)
  const startingBalance = 10;
  const updatedPlayers = tournament.players.map(p => ({ ...p, balance: startingBalance }));

  // Build a map of rounds with updated scores
  const roundScores = new Map<number, { a: number; b: number }>();
  for (const r of allRounds) {
    if (r.status === 'completed' && r.team_a_score != null && r.team_b_score != null) {
      if (r.round_index === roundIndex) {
        roundScores.set(r.round_index, { a: newScoreA, b: newScoreB });
      } else {
        roundScores.set(r.round_index, { a: r.team_a_score, b: r.team_b_score });
      }
    }
  }

  // Apply game earnings for all completed rounds
  for (const [ri, scores] of roundScores) {
    const s = tournament.schedule[ri - 1];
    if (!s) continue;
    s.teamA.forEach(idx => {
      updatedPlayers[idx] = { ...updatedPlayers[idx], balance: updatedPlayers[idx].balance + scores.a * EUROS_PER_GAME };
    });
    s.teamB.forEach(idx => {
      updatedPlayers[idx] = { ...updatedPlayers[idx], balance: updatedPlayers[idx].balance + scores.b * EUROS_PER_GAME };
    });
  }

  // 3. Re-settle bets for the edited round
  const roundBets = bets.filter(b => b.round_index === roundIndex);
  const newWinner = newScoreA > newScoreB ? 'A' : newScoreB > newScoreA ? 'B' : 'draw';

  for (const bet of roundBets) {
    if (newWinner === 'draw') {
      // Refund: stake was already deducted when bet was placed, give it back
      updatedPlayers[bet.bettor_index] = {
        ...updatedPlayers[bet.bettor_index],
        balance: updatedPlayers[bet.bettor_index].balance + bet.stake,
      };
      await supabase.from('blitz_bets').update({ status: 'draw' }).eq('id', bet.id);
    } else if (bet.predicted_winner === newWinner) {
      updatedPlayers[bet.bettor_index] = {
        ...updatedPlayers[bet.bettor_index],
        balance: updatedPlayers[bet.bettor_index].balance + bet.stake * 2,
      };
      await supabase.from('blitz_bets').update({ status: 'won' }).eq('id', bet.id);
    } else {
      // Lost — stake already deducted, nothing to add
      await supabase.from('blitz_bets').update({ status: 'lost' }).eq('id', bet.id);
    }
  }

  // Also re-apply settled bets from OTHER rounds (not the edited one)
  const otherSettledBets = bets.filter(b => b.round_index !== roundIndex && b.status !== 'pending');
  for (const bet of otherSettledBets) {
    if (bet.status === 'won') {
      updatedPlayers[bet.bettor_index] = {
        ...updatedPlayers[bet.bettor_index],
        balance: updatedPlayers[bet.bettor_index].balance + bet.stake * 2,
      };
    } else if (bet.status === 'draw') {
      updatedPlayers[bet.bettor_index] = {
        ...updatedPlayers[bet.bettor_index],
        balance: updatedPlayers[bet.bettor_index].balance + bet.stake,
      };
    }
    // lost: nothing to add (stake already deducted)
  }

  // 4. Save updated players
  const { error } = await supabase.from('blitz_tournaments')
    .update({ players: updatedPlayers as any } as any).eq('id', id);
  return { error: error?.message ?? null };
}
