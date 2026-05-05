import { useState, useEffect } from 'react';
import { getMatchesByRound, getLiveRound, getRounds, claimBooking } from '@/services';
import type { Match, Round } from '@/lib/types';

export function Matches() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [liveRound, setLiveRound] = useState<Round | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const tournamentId = ''; // TODO: Get from context/params

  useEffect(() => {
    const loadRounds = async () => {
      try {
        setLoading(true);
        setError(null);

        const [roundsData, liveRoundData] = await Promise.all([
          getRounds(tournamentId),
          getLiveRound(tournamentId),
        ]);

        setRounds(roundsData);
        setLiveRound(liveRoundData);

        if (liveRoundData) {
          setSelectedRoundId(liveRoundData.id);
        } else if (roundsData.length > 0) {
          setSelectedRoundId(roundsData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dei turni');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      loadRounds();
    }
  }, [tournamentId]);

  useEffect(() => {
    const loadMatches = async () => {
      if (!selectedRoundId) return;
      try {
        const data = await getMatchesByRound(selectedRoundId);
        setMatches(data);
      } catch (err) {
        console.error('Error loading matches:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle partite');
      }
    };

    loadMatches();
  }, [selectedRoundId]);

  const handleClaimBooking = async (matchId: string) => {
    try {
      // TODO: Get current player ID from context
      const currentPlayerId = '';
      await claimBooking(matchId, currentPlayerId);
      // Reload matches
      if (selectedRoundId) {
        const data = await getMatchesByRound(selectedRoundId);
        setMatches(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella prenotazione');
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  if (loading) {
    return <div className="p-4">Caricamento...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded">
        <p className="text-red-800">{error}</p>
        <button onClick={handleRetry} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">
          Riprova
        </button>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Nessun turno trovato per questo torneo.
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Partite</h1>

      {liveRound && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 font-semibold">Turno in corso: {liveRound.name}</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Seleziona turno:</label>
        <select
          value={selectedRoundId || ''}
          onChange={(e) => setSelectedRoundId(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {rounds.map((round) => (
            <option key={round.id} value={round.id}>
              {round.name} ({round.status})
            </option>
          ))}
        </select>
      </div>

      {matches.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          Nessuna partita trovata per questo turno.
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="p-4 border rounded">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-sm text-gray-600">Squadra A</p>
                  <p className="font-semibold">{match.team_a_player1_id || 'TBD'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Risultato</p>
                  <p className="font-semibold">
                    {match.sets_a ?? '-'} - {match.sets_b ?? '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Squadra B</p>
                  <p className="font-semibold">{match.team_b_player1_id || 'TBD'}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">Status: {match.status}</p>

              {match.status === 'BookingRequired' && (
                <button
                  onClick={() => handleClaimBooking(match.id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Prenota campo
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Matches;
