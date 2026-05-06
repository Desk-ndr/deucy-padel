import { useState, useMemo, useEffect } from 'react';

// ── Global player identity (persisted across sessions) ──

export interface GlobalPlayer {
  playerId: string;
  playerName: string;
}

export function getGlobalPlayer(): GlobalPlayer | null {
  try {
    const raw = localStorage.getItem('deucy-player');
    if (raw) return JSON.parse(raw) as GlobalPlayer;
  } catch { /* ignore */ }
  return null;
}

export function clearGlobalPlayer(): void {
  localStorage.removeItem('deucy-player');
}

// ── Device ID (for creator tracking) ──

function getDeviceId(): string {
  const key = 'blitz-device-id';
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

// ── Tournament-scoped identity (auto-detected from global player) ──

interface TournamentPlayer {
  name: string;
  player_id?: string;
}

export function useBlitzIdentity(
  tournamentId: string | undefined,
  createdBy: string | null,
  tournamentPlayers?: TournamentPlayer[]
) {
  const deviceId = useMemo(() => getDeviceId(), []);
  const globalPlayer = useMemo(() => getGlobalPlayer(), []);
  const isCreator = createdBy !== null && deviceId === createdBy;

  // Auto-detect playerIndex from global identity
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);

  useEffect(() => {
    if (!globalPlayer || !tournamentPlayers) {
      setPlayerIndex(null);
      setPlayerName(null);
      return;
    }

    // Match by player_id
    const idx = tournamentPlayers.findIndex(
      p => p.player_id === globalPlayer.playerId
    );

    if (idx >= 0) {
      setPlayerIndex(idx);
      setPlayerName(tournamentPlayers[idx].name);
    } else {
      // Fallback: match by name (for tournaments created before player_id was added)
      const nameIdx = tournamentPlayers.findIndex(
        p => p.name.toLowerCase() === globalPlayer.playerName.toLowerCase()
      );
      if (nameIdx >= 0) {
        setPlayerIndex(nameIdx);
        setPlayerName(tournamentPlayers[nameIdx].name);
      } else {
        setPlayerIndex(null);
        setPlayerName(null);
      }
    }
  }, [globalPlayer, tournamentPlayers]);

  return {
    playerIndex,
    playerName,
    isCreator,
    deviceId,
    isLoggedIn: !!globalPlayer,
    isSpectator: !!globalPlayer && playerIndex === null && !!tournamentPlayers,
    globalPlayer,
  };
}
