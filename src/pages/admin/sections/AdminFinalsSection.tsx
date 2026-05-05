import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Player } from '@/lib/types';

interface AdminFinalsSectionProps {
  tournamentId: string;
  players: Player[];
  isLoading?: boolean;
}

export function AdminFinalsSection({
  tournamentId,
  players,
  isLoading = false,
}: AdminFinalsSectionProps) {
  const [isCreatingPlayoffs, setIsCreatingPlayoffs] = useState(false);

  const handleConfirmFinalists = async () => {
    if (players.length < 4) {
      toast.error('Almeno 4 giocatori sono necessari per i playoff.');
      return;
    }

    setIsCreatingPlayoffs(true);
    try {
      // Sort players by credits_balance (descending) to get ranking
      const sortedPlayers = [...players].sort(
        (a, b) => (b.credits_balance || 0) - (a.credits_balance || 0)
      );

      const topFour = sortedPlayers.slice(0, 4);
      const [first, second, third, fourth] = topFour;

      // Create semi-final round
      const { data: semiRound, error: roundError } = await supabase
        .from('rounds')
        .insert({
          tournament_id: tournamentId,
          is_playoff: true,
          playoff_type: 'semi',
          status: 'Upcoming',
          index: 999, // High index for playoffs
        })
        .select('*')
        .single();

      if (roundError) throw new Error(`Failed to create semi-final round: ${roundError.message}`);

      // Create semi-final matches: #1+#4 vs #2+#3
      const match1 = {
        tournament_id: tournamentId,
        round_id: semiRound.id,
        team_a_player1_id: first.id,
        team_a_player2_id: fourth.id,
        team_b_player1_id: second.id,
        team_b_player2_id: third.id,
        status: 'Scheduled',
        is_bye: false,
      };

      const { error: matchError } = await supabase
        .from('matches')
        .insert(match1);

      if (matchError) throw new Error(`Failed to create semi-final match: ${matchError.message}`);

      toast.success(
        `Semifinali create: ${first.full_name} & ${fourth.full_name} vs ${second.full_name} & ${third.full_name}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error(`Errore nella creazione dei playoff: ${message}`);
      console.error('Error creating playoffs:', error);
    } finally {
      setIsCreatingPlayoffs(false);
    }
  };

  const topFour = players
    .sort((a, b) => (b.credits_balance || 0) - (a.credits_balance || 0))
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-3">Finalisti (Top 4 per crediti)</h3>
        <ul className="space-y-2 mb-4">
          {topFour.map((player, index) => (
            <li key={player.id} className="text-sm">
              #{index + 1} {player.full_name} - {player.credits_balance || 0} crediti
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={handleConfirmFinalists}
        disabled={isLoading || isCreatingPlayoffs || topFour.length < 4}
        className="w-full"
      >
        {isCreatingPlayoffs ? 'Creazione in corso...' : 'Conferma Finalisti'}
      </Button>
    </div>
  );
}

export default AdminFinalsSection;
