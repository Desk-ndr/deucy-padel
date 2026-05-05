import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getTournamentPlayers,
  joinTournament,
  getActiveTournaments,
} from '@/services';
import { supabase } from '@/integrations/supabase/client';
import type { Tournament } from '@/lib/types';

export function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningTournamentId, setJoiningTournamentId] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setIsLoading(true);
      const data = await getActiveTournaments();
      setTournaments(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load tournaments: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTournament = async (tournament: Tournament) => {
    // Bug 2 Fix: Validate tournament status
    if (tournament.status !== 'SignupOpen') {
      toast.error('Le iscrizioni per questo torneo sono chiuse.');
      return;
    }

    try {
      setJoiningTournamentId(tournament.id);

      // Get current player count
      const players = await getTournamentPlayers(tournament.id);
      const playerCount = players.length;

      // Bug 2 Fix: Check if tournament is full
      if (
        tournament.max_players &&
        playerCount >= tournament.max_players
      ) {
        toast.error('Torneo al completo.');
        return;
      }

      // For now, show a dialog to collect player info
      // In a real app, this would open a modal with a form
      const fullName = prompt('Inserisci il tuo nome completo:');
      if (!fullName) return;

      const phone = prompt('Inserisci il tuo numero di telefono:');
      if (!phone) return;

      // In production, PIN should be hashed on the client or server
      const pin = prompt('Inserisci un PIN a 4 cifre:');
      if (!pin || pin.length !== 4) {
        toast.error('PIN deve essere 4 cifre');
        return;
      }

      // Hash the PIN (simple example - use proper hashing in production)
      const pinHash = btoa(pin);

      // Perform the join
      await joinTournament(tournament.id, {
        full_name: fullName,
        phone: phone,
        pin_hash: pinHash,
      });

      toast.success(`Iscritto al torneo: ${tournament.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error(`Errore nell'iscrizione: ${message}`);
    } finally {
      setJoiningTournamentId(null);
    }
  };

  if (isLoading) {
    return <div className="p-4">Caricamento tornei...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Tornei Disponibili</h1>

      {tournaments.length === 0 ? (
        <p className="text-gray-500">Nessun torneo disponibile</p>
      ) : (
        <div className="grid gap-4">
          {tournaments.map(tournament => (
            <div
              key={tournament.id}
              className="border rounded-lg p-4 space-y-2"
            >
              <h2 className="text-lg font-semibold">{tournament.name}</h2>
              <div className="space-y-1 text-sm">
                <p>Status: {tournament.status}</p>
                <p>Max giocatori: {tournament.max_players}</p>
                {tournament.description && (
                  <p className="text-gray-600">{tournament.description}</p>
                )}
              </div>

              <Button
                onClick={() => handleJoinTournament(tournament)}
                disabled={
                  joiningTournamentId === tournament.id ||
                  tournament.status !== 'SignupOpen'
                }
                className="w-full"
              >
                {joiningTournamentId === tournament.id
                  ? 'Iscrizione in corso...'
                  : 'Iscriviti'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Tournaments;
