import { supabase } from '@/integrations/supabase/client';
import type { Match, MatchWithPlayers, Round } from '@/lib/types';

export async function getMatchesByRound(roundId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('round_id', roundId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch matches by round: ${error.message}`);
  return data as Match[];
}

export async function getMatchesForPlayer(tournamentId: string, playerId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .or(
      `team_a_player1_id.eq.${playerId},team_a_player2_id.eq.${playerId},team_b_player1_id.eq.${playerId},team_b_player2_id.eq.${playerId},bye_player_id.eq.${playerId}`
    )
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch matches for player: ${error.message}`);
  return data as Match[];
}

export async function getMatchWithPlayers(matchId: string): Promise<MatchWithPlayers> {
  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      *,
      team_a_player1:players!team_a_player1_id(*),
      team_a_player2:players!team_a_player2_id(*),
      team_b_player1:players!team_b_player1_id(*),
      team_b_player2:players!team_b_player2_id(*),
      bye_player:players!bye_player_id(*)
      `
    )
    .eq('id', matchId)
    .single();

  if (error) throw new Error(`Failed to fetch match with players: ${error.message}`);
  return data as MatchWithPlayers;
}

export async function claimBooking(matchId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      booking_claimed_by_player_id: playerId,
      booking_claimed_at: new Date().toISOString(),
      status: 'BookingClaimed',
    })
    .eq('id', matchId);

  if (error) throw new Error(`Failed to claim booking: ${error.message}`);
}

export async function reportResult(
  matchId: string,
  setsA: number,
  setsB: number,
  isUnfinished: boolean
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      sets_a: setsA,
      sets_b: setsB,
      is_unfinished: isUnfinished,
      status: 'Played',
      played_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (error) throw new Error(`Failed to report match result: ${error.message}`);
}

export async function getRounds(tournamentId: string): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('index', { ascending: true });

  if (error) throw new Error(`Failed to fetch rounds: ${error.message}`);
  return data as Round[];
}

export async function getLiveRound(tournamentId: string): Promise<Round | null> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'Live')
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch live round: ${error.message}`);
  return data as Round | null;
}
