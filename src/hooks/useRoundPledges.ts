import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PledgeItem } from '@/lib/types';

export interface RoundPledgeMap {
  /** playerId -> PledgeItem (any pledge for the tournament) */
  [playerId: string]: PledgeItem;
}

/**
 * Returns a map of playerId -> their pledge for the tournament (not round-specific).
 * Each player maps to their first approved/visible pledge.
 *
 * Draft pledges are only visible to the player who created them.
 * Approved pledges are visible to everyone.
 *
 * @param tournamentId - The tournament ID
 * @param _roundId - Unused, kept for backwards compatibility
 * @param currentPlayerId - The ID of the current player (needed to show their own drafts)
 */
export function useRoundPledges(tournamentId: string | undefined, _roundId?: string | undefined, currentPlayerId?: string) {
  const [pledges, setPledges] = useState<RoundPledgeMap>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tournamentId) {
      setPledges({});
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('pledge_items')
      .select('*')
      .eq('tournament_id', tournamentId)
      .in('status', ['Approved', 'Draft']);

    const map: RoundPledgeMap = {};
    (data || []).forEach((p) => {
      // Show Approved pledges from anyone. Show Draft pledges only if created by current player.
      const isVisible = p.status === 'Approved' || (p.status === 'Draft' && p.pledged_by_player_id === currentPlayerId);

      if (isVisible && !map[p.pledged_by_player_id]) {
        // Keep first pledge found per player (already have one = skip)
        map[p.pledged_by_player_id] = p as PledgeItem;
      }
    });
    setPledges(map);
    setLoading(false);
  }, [tournamentId, currentPlayerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { pledges, loading, refresh };
}
