import { useState, useEffect } from 'react';
import { getPlayer, uploadAvatar, updateProfile, getPlayerPledge } from '@/services';
import type { Player, PledgeItem } from '@/lib/types';

export function PlayerProfile() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [pledge, setPledge] = useState<PledgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');

  // TODO: Get playerId and tournamentId from context/params
  const playerId = '';
  const tournamentId = '';

  useEffect(() => {
    const loadPlayer = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPlayer(playerId);
        setPlayer(data);
        setFullName(data.full_name || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento del profilo');
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      loadPlayer();
    }
  }, [playerId]);

  useEffect(() => {
    const loadPledge = async () => {
      if (!playerId || !tournamentId) return;
      try {
        const data = await getPlayerPledge(tournamentId, playerId);
        setPledge(data);
      } catch (err) {
        console.error('Error loading pledge:', err);
      }
    };

    loadPledge();
  }, [playerId, tournamentId]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !player) return;

    try {
      setUploading(true);
      setError(null);
      const avatarUrl = await uploadAvatar(player.id, file);
      await updateProfile(player.id, { avatar_url: avatarUrl });
      setPlayer({ ...player, avatar_url: avatarUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento della foto');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!player) return;
    try {
      setError(null);
      await updateProfile(player.id, { full_name: fullName });
      setPlayer({ ...player, full_name: fullName });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento del profilo');
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

  if (!player) {
    return (
      <div className="p-4 text-center text-gray-500">
        Giocatore non trovato.
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profilo</h1>

      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          {player.avatar_url && (
            <img
              src={player.avatar_url}
              alt={player.full_name}
              className="w-32 h-32 rounded-full object-cover mb-4"
            />
          )}
          <label className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
            {uploading ? 'Caricamento...' : 'Carica foto'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Name Section */}
        <div>
          <label className="block text-sm font-semibold mb-2">Nome completo</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleUpdateProfile}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Salva
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded">
            <p className="text-sm text-gray-600">Crediti</p>
            <p className="text-2xl font-bold">{player.credits_balance}</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-sm text-gray-600">Vittorie</p>
            <p className="text-2xl font-bold">{player.match_wins || 0}</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-sm text-gray-600">Set vinti</p>
            <p className="text-2xl font-bold">{player.sets_won || 0}</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-semibold">{player.status}</p>
          </div>
        </div>

        {/* Pledge Section */}
        {pledge && (
          <div className="p-4 border rounded">
            <h2 className="text-lg font-bold mb-3">Impegno per l'Asta</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Titolo</p>
                <p className="font-semibold">{pledge.title}</p>
              </div>
              {pledge.description && (
                <div>
                  <p className="text-sm text-gray-600">Descrizione</p>
                  <p>{pledge.description}</p>
                </div>
              )}
              {pledge.image_url && (
                <img
                  src={pledge.image_url}
                  alt={pledge.title}
                  className="w-full h-auto rounded"
                />
              )}
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold">{pledge.status}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerProfile;
