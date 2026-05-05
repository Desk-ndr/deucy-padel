import { supabase } from '@/integrations/supabase/client';
import type { CreditLedgerEntry, Player } from '@/lib/types';

export async function getPlayerBalance(playerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('players')
    .select('credits_balance')
    .eq('id', playerId)
    .single();

  if (error) throw new Error(`Failed to fetch player balance: ${error.message}`);
  return (data?.credits_balance as number) || 0;
}

export async function getLedgerEntries(
  tournamentId: string,
  playerId: string
): Promise<CreditLedgerEntry[]> {
  const { data, error } = await supabase
    .from('credit_ledger_entries')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch ledger entries: ${error.message}`);
  return data as CreditLedgerEntry[];
}

export async function getLeaderboard(tournamentId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'Active')
    .order('credits_balance', { ascending: false })
    .order('match_wins', { ascending: false })
    .order('sets_won', { ascending: false });

  if (error) throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  return data as Player[];
}
