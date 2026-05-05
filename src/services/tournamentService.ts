import { supabase } from '@/integrations/supabase/client';
import type { Tournament, Player, PlayerGender } from '@/lib/types';

export async function getTournament(id: string): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch tournament: ${error.message}`);
  return data as Tournament;
}

export async function getTournamentByJoinCode(code: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('join_code', code)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch tournament by join code: ${error.message}`);
  return data as Tournament | null;
}

export async function getTournamentPlayers(tournamentId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch tournament players: ${error.message}`);
  return data as Player[];
}

export async function getActiveTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .in('status', ['SignupOpen', 'Live', 'AuctionLive'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch active tournaments: ${error.message}`);
  return data as Tournament[];
}

export async function joinTournament(
  tournamentId: string,
  playerData: {
    full_name: string;
    phone: string;
    pin_hash: string;
    gender?: PlayerGender;
  }
): Promise<Player> {
  // Bug 2 Fix: Validate tournament status before joining
  const tournament = await getTournament(tournamentId);

  if (tournament.status !== 'SignupOpen') {
    throw new Error('Le iscrizioni per questo torneo sono chiuse.');
  }

  // Bug 2 Fix: Check if tournament is full
  const existingPlayers = await getTournamentPlayers(tournamentId);
  const playerCount = existingPlayers.length;

  if (tournament.max_players && playerCount >= tournament.max_players) {
    throw new Error('Torneo al completo.');
  }

  const { data, error } = await supabase
    .from('players')
    .insert({
      tournament_id: tournamentId,
      full_name: playerData.full_name,
      phone: playerData.phone,
      pin_hash: playerData.pin_hash,
      gender: playerData.gender || null,
      confirmed: false,
      status: 'Active',
      credits_balance: 0,
      matches_played: 0,
      sets_won: 0,
      sets_lost: 0,
      match_wins: 0,
      match_losses: 0,
      no_shows: 0,
      has_seen_onboarding: false,
      has_seen_auction_intro: false,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to join tournament: ${error.message}`);
  return data as Player;
}

export async function confirmParticipation(playerId: string): Promise<void> {
  const { error } = await supabase
    .from('players')
    .update({ confirmed: true })
    .eq('id', playerId);

  if (error) throw new Error(`Failed to confirm participation: ${error.message}`);
}
