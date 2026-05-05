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
}

export interface BlitzTournamentData {
  id: string; name: string; status: string; players: BlitzPlayer[];
  current_round: number; total_rounds: number; round_duration_seconds: number;
  schedule: BlitzRoundSchedule[]; timer_started_at: string | null;
  timer_paused_remaining: number | null; created_by: string | null;
}

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

// ── Mutations ──

export async function createTournament(name: string, createdBy: string) {
  const { data, error } = await supabase.from('blitz_tournaments')
    .insert({ name: name.trim(), created_by: createdBy } as any).select().single();
  if (error) return { data: null, error: error.message };
  return { data: parseTournament(data), error: null };
}

export async function deleteTournament(id: string) {
  await supabase.from('blitz_bets').delete().eq('tournament_id', id);
  await supabase.from('blitz_rounds').delete().eq('tournament_id', id);
  await supabase.from('blitz_pledges').delete().eq('tournament_id', id);
  const { error } = await supabase.from('blitz_tournaments').delete().eq('id', id);
  return { error: error?.message ?? null };
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
  // 1. Complete the round
  const { error: rErr } = await supabase.from('blitz_rounds')
    .update({ team_a_score: scoreA, team_b_score: scoreB, status: 'completed' }).eq('id', roundId);
  if (rErr) return { error: rErr.message };

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
      status: 'finished', timer_started_at: null, timer_paused_remaining: null,
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

export async function resetTournament(id: string, playerNames: string[]) {
  await supabase.from('blitz_bets').delete().eq('tournament_id', id);
  await supabase.from('blitz_rounds').delete().eq('tournament_id', id);
  const resetPlayers = playerNames.map(name => ({ name, balance: 0 }));
  const { error } = await supabase.from('blitz_tournaments').update({
    status: 'setup', current_round: 0, players: resetPlayers as any,
    schedule: [] as any, timer_started_at: null, timer_paused_remaining: null,
  } as any).eq('id', id);
  return { error: error?.message ?? null };
}
