import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTournament, getRounds, getBets,
  subscribeTournament, subscribeBets, subscribeRounds,
  BlitzTournamentData, BlitzRound, BlitzBet,
} from '@/services/blitzService';

export function useBlitzRealtime(id: string | undefined) {
  const [tournament, setTournament] = useState<BlitzTournamentData | null>(null);
  const [rounds, setRounds] = useState<BlitzRound[]>([]);
  const [bets, setBets] = useState<BlitzBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  const refetch = useCallback(async () => {
    if (!id) return;
    try {
      const [tRes, rRes, bRes] = await Promise.all([
        getTournament(id), getRounds(id), getBets(id),
      ]);
      if (tRes.error) setError(tRes.error);
      if (tRes.data) setTournament(tRes.data);
      setRounds(rRes.data);
      setBets(bRes.data);
      setLoading(false);
      retryCount.current = 0;
    } catch (err) {
      // Auto-retry up to 3 times with backoff
      if (retryCount.current < 3) {
        retryCount.current += 1;
        const delay = retryCount.current * 1500;
        setTimeout(() => refetch(), delay);
      } else {
        setError('Failed to load tournament. Check your connection.');
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    retryCount.current = 0;
    setLoading(true);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!id) return;
    const tChannel = subscribeTournament(id, (t) => setTournament(t));
    const bChannel = subscribeBets(id, () => {
      getBets(id).then(res => setBets(res.data));
      getTournament(id).then(res => { if (res.data) setTournament(res.data); });
    });
    // Rounds: refetch rounds AND tournament whenever a round row changes
    // (e.g. another device just completed the active round). Tournament
    // refetch is needed because submitScore advances current_round and
    // mutates player balances on the same transaction.
    const rChannel = subscribeRounds(id, () => {
      getRounds(id).then(res => setRounds(res.data));
      getTournament(id).then(res => { if (res.data) setTournament(res.data); });
    });
    return () => { tChannel.unsubscribe(); bChannel.unsubscribe(); rChannel.unsubscribe(); };
  }, [id]);

  return { tournament, rounds, bets, loading, error, refetch };
}
