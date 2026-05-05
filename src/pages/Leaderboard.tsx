import { useState, useEffect } from 'react';
import { getLeaderboard, getLedgerEntries } from '@/services';
import type { Player, CreditLedgerEntry } from '@/lib/types';

export function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<CreditLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const tournamentId = ''; // TODO: Get from context/params

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getLeaderboard(tournamentId);
        setPlayers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento della classifica');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      loadLeaderboard();
    }
  }, [tournamentId]);

  useEffect(() => {
    const loadLedger = async () => {
      if (!selectedPlayerId || !tournamentId) return;
      try {
        const data = await getLedgerEntries(tournamentId, selectedPlayerId);
        setLedgerEntries(data);
      } catch (err) {
        console.error('Error loading ledger entries:', err);
      }
    };

    loadLedger();
  }, [selectedPlayerId, tournamentId]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Retry loading logic
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

  if (players.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Nessun giocatore trovato in questa classifica.
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Classifica</h1>
      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={player.id}
            className="p-3 border rounded cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedPlayerId(player.id)}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold">#{index + 1}</span>
                <span className="ml-3">{player.full_name}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{player.credits_balance} crediti</div>
                <div className="text-sm text-gray-600">{player.match_wins} vittorie</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPlayerId && ledgerEntries.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Cronologia dei crediti</h2>
          <div className="space-y-2">
            {ledgerEntries.map((entry) => (
              <div key={entry.id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <div>{entry.description || 'Transazione'}</div>
                  <div className={entry.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                    {entry.amount > 0 ? '+' : ''}{entry.amount}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(entry.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
