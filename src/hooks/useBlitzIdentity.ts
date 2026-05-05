import { useState, useMemo } from 'react';

function getDeviceId(): string {
  const key = 'blitz-device-id';
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

export function useBlitzIdentity(tournamentId: string | undefined, createdBy: string | null) {
  const deviceId = useMemo(() => getDeviceId(), []);
  const storageKey = tournamentId ? `blitz-identity-${tournamentId}` : null;

  const readStored = () => {
    if (!storageKey) return { playerIndex: null as number | null, playerName: null as string | null };
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { const parsed = JSON.parse(raw); return { playerIndex: parsed.playerIndex as number, playerName: parsed.playerName as string }; }
    } catch { /* ignore */ }
    return { playerIndex: null as number | null, playerName: null as string | null };
  };

  const [identity, setIdentity] = useState(readStored);
  const isCreator = createdBy !== null && deviceId === createdBy;

  const pickPlayer = (index: number, name: string) => {
    setIdentity({ playerIndex: index, playerName: name });
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify({ playerIndex: index, playerName: name }));
  };

  const clearIdentity = () => {
    setIdentity({ playerIndex: null, playerName: null });
    if (storageKey) localStorage.removeItem(storageKey);
  };

  return { playerIndex: identity.playerIndex, playerName: identity.playerName, isCreator, deviceId, pickPlayer, clearIdentity };
}
