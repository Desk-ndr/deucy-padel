import { useState, useEffect, useRef } from 'react';
import { BlitzTournamentData } from '@/services/blitzService';

export function useBlitzTimer(tournament: BlitzTournamentData | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  const timerStartedAt = tournament?.timer_started_at ?? null;
  const pausedRemaining = tournament?.timer_paused_remaining ?? null;
  const duration = tournament?.round_duration_seconds ?? 600;

  const isRunning = timerStartedAt !== null && pausedRemaining === null;
  const isPaused = pausedRemaining !== null && timerStartedAt === null;
  const isExpired = isRunning && secondsLeft <= 0;

  // Calculate seconds left from server timestamp
  const calcSeconds = () => {
    if (timerStartedAt && !pausedRemaining) {
      const elapsed = (Date.now() - Date.parse(timerStartedAt)) / 1000;
      return Math.max(0, Math.ceil(duration - elapsed));
    }
    if (pausedRemaining !== null) return pausedRemaining;
    return duration;
  };

  // Set initial value when tournament props change
  useEffect(() => {
    setSecondsLeft(calcSeconds());
  }, [timerStartedAt, pausedRemaining, duration]);

  // requestAnimationFrame loop for running timer
  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }

    const tick = (now: number) => {
      if (now - lastUpdateRef.current >= 250) {
        lastUpdateRef.current = now;
        setSecondsLeft(calcSeconds());
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRunning, timerStartedAt, duration]);

  return { secondsLeft, isRunning, isPaused, isExpired };
}
