import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Round } from '@/lib/types';

interface AdminRoundsSectionProps {
  tournamentId: string;
  rounds: Round[];
  onRoundsUpdated?: () => void;
}

export function AdminRoundsSection({
  tournamentId,
  rounds,
  onRoundsUpdated,
}: AdminRoundsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRound = async () => {
    setIsCreating(true);
    try {
      const nextIndex = Math.max(...rounds.map(r => r.index || 0), 0) + 1;

      const { error } = await supabase
        .from('rounds')
        .insert({
          tournament_id: tournamentId,
          is_playoff: false,
          status: 'Upcoming',
          index: nextIndex,
        });

      if (error) throw new Error(`Failed to create round: ${error.message}`);

      toast.success(`Round ${nextIndex} created successfully`);
      onRoundsUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error creating round: ${message}`);
      console.error('Error creating round:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-3">Rounds</h3>
        <div className="space-y-2 mb-4">
          {rounds.length === 0 ? (
            <p className="text-sm text-gray-500">No rounds created yet</p>
          ) : (
            rounds.map(round => (
              <div key={round.id} className="text-sm p-2 bg-gray-100 rounded">
                <div className="font-medium">Round {round.index}</div>
                <div className="text-xs text-gray-600">Status: {round.status}</div>
                {round.is_playoff && (
                  <div className="text-xs text-blue-600">
                    Playoff Type: {round.playoff_type}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Button
        onClick={handleCreateRound}
        disabled={isCreating}
        className="w-full"
      >
        {isCreating ? 'Creating...' : 'Create Round'}
      </Button>
    </div>
  );
}

export default AdminRoundsSection;
