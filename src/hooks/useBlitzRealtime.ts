import { useState, useEffect, useCallback } from 'react';
import {
  getTournament, getRounds, getBets,
  subscribeTournament, subscribeBets,
  BlitzTournamentData, BlitzRound, BlitzBet,
} from '@/services/blitzService';

export function useBlitzRealtime(id: string | undefined) {
  const [tournament, setTournament] = useState<BlitzTournamentData | null>(null);
  const [rounds, setRounds] = useState<BlitzRound[]>([]);
  const [bets, setBets] = useState<BlitzBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    const [tRes, rRes, bRes] = await Promise.all([
      getTournament(id), getRounds(id), getBets(id),
    ]);
    if (tRes.error) setError(tRes.error);
    if (tRes.data) setTournament(tRes.data);
    setRounds(rRes.data);
    setBets(bRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!id) return;
    const tChannel = subscribeTournament(id, (t) => setTournament(t));
    const bChannel = subscribeBets(id, () => {
      getBets(id).then(res => setBets(res.data));
      getTournament(id).then(res => { if (res.data) setTournament(res.data); });
    });
    return () => { tChannel.unsubscribe(); bChannel.unsubscribe(); };
  }, [id]);

  return { tournament, rounds, bets, loading, error, refetch };
}
