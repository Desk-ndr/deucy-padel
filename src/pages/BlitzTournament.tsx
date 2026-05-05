import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useBlitzRealtime } from '@/hooks/useBlitzRealtime';
import { useBlitzIdentity } from '@/hooks/useBlitzIdentity';
import { useBlitzTimer } from '@/hooks/useBlitzTimer';
import {
  startTournament, startTimer, pauseTimer, resetTimer,
  submitScore, placeBet, resetTournament, BlitzPlayer,
} from '@/services/blitzService';
import { generateSchedule } from '@/lib/blitz-schedule';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { DeucyBottomNav, type DeucyTab } from '@/components/ui/deucy';
import BlitzSetup from '@/components/blitz/BlitzSetup';
import BlitzIdentityPicker from '@/components/blitz/BlitzIdentityPicker';
import BlitzMatchTab from '@/components/blitz/BlitzMatchTab';
import BlitzCalendarTab from '@/components/blitz/BlitzCalendarTab';
import BlitzLeaderboard from '@/components/blitz/BlitzLeaderboard';
import BlitzBettingCard from '@/components/blitz/BlitzBettingCard';

export default function BlitzTournament() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tournament, rounds, bets, loading, refetch } = useBlitzRealtime(id);
  const { playerIndex, isCreator, deviceId, pickPlayer, clearIdentity } = useBlitzIdentity(id, tournament?.created_by ?? null);
  const timerProps = useBlitzTimer(tournament);
  const [activeTab, setActiveTab] = useState<DeucyTab>('match');
  const [showIdentity, setShowIdentity] = useState(false);

  // ── Handlers ──

  const handleStart = async (config: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }, names: string[]) => {
    if (!id) return;
    const players: BlitzPlayer[] = names.map(n => ({ name: n.trim(), balance: 0 }));
    const schedule = generateSchedule(names.length, config.totalRounds);
    const { error } = await startTournament(id, config, players, schedule);
    if (error) toast({ title: 'Error starting', description: error, variant: 'destructive' });
    else { toast({ title: 'Tournament started!' }); refetch(); }
  };

  const handleStartTimer = async () => {
    if (!id || !tournament) return;
    const dur = timerProps.isPaused && tournament.timer_paused_remaining
      ? tournament.timer_paused_remaining : tournament.round_duration_seconds;
    await startTimer(id, dur);
  };

  const handlePauseTimer = async () => { if (id) await pauseTimer(id, Math.ceil(timerProps.secondsLeft)); };
  const handleResetTimer = async () => { if (id && tournament) await resetTimer(id, tournament.round_duration_seconds); };

  const handleSubmitScore = async (scoreA: number, scoreB: number) => {
    if (!id || !tournament) return;
    const round = rounds.find(r => r.round_index === tournament.current_round);
    if (!round) return;
    const { error } = await submitScore(id, round.id, round.round_index, scoreA, scoreB, tournament, bets);
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
    else {
      const isLast = tournament.current_round >= tournament.total_rounds;
      toast({ title: isLast ? 'Tournament complete!' : `Round ${tournament.current_round} done!` });
      refetch();
    }
  };

  const handlePlaceBet = async (prediction: 'A' | 'B', stake: number) => {
    if (!id || !tournament || playerIndex === null) return;
    const updated = [...tournament.players];
    updated[playerIndex] = { ...updated[playerIndex], balance: updated[playerIndex].balance - stake };
    const { error } = await placeBet(id, tournament.current_round, playerIndex, prediction, stake, updated);
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
    else { toast({ title: `Prediction placed: Team ${prediction}` }); refetch(); }
  };

  const handleReset = async () => {
    if (!id || !tournament) return;
    await resetTournament(id, tournament.players.map(p => p.name));
    toast({ title: 'Tournament reset!' }); refetch();
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: tournament?.name || 'Blitz', url });
    else { navigator.clipboard.writeText(url); toast({ title: 'Link copied!' }); }
  };

  // ── Render states ──

  if (loading || !tournament) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: colors.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: colors.primary, fontFamily: fonts.mono }}>
          Loading...
        </div>
      </div>
    );
  }

  // Identity picker
  if (playerIndex === null && tournament.status === 'live' && showIdentity) {
    return (
      <BlitzIdentityPicker
        players={tournament.players}
        onPick={(i, n) => { pickPlayer(i, n); setShowIdentity(false); }}
        onSpectate={() => setShowIdentity(false)}
      />
    );
  }

  // Setup
  if (tournament.status === 'setup') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
        <div style={{ maxWidth: 430, margin: '0 auto', padding: spacing.lg }}>
          <button onClick={() => navigate('/blitz')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: spacing.xs,
            color: colors.textSecondary, fontSize: 14, fontWeight: 600,
            fontFamily: fonts.sans, marginBottom: spacing.lg,
          }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          {isCreator ? (
            <BlitzSetup tournament={tournament} onStart={handleStart} />
          ) : (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: colors.primary, display: 'block', marginBottom: spacing.md }}>
                ...
              </span>
              <span style={{ ...typeScale.body, color: colors.muted }}>Waiting for host to start...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Prompt identity
  if (playerIndex === null && tournament.status === 'live' && !showIdentity) {
    setTimeout(() => setShowIdentity(true), 500);
  }

  // ── Live / Finished ──

  const sortedPlayers = tournament.players.map((p, i) => ({ ...p, index: i })).sort((a, b) => b.balance - a.balance);
  const currentSchedule = tournament.current_round > 0 && tournament.current_round <= tournament.total_rounds && tournament.schedule.length > 0
    ? tournament.schedule[tournament.current_round - 1]
    : null;

  const existingBet = playerIndex !== null
    ? bets.find(b => b.round_index === tournament.current_round && b.bettor_index === playerIndex && b.status === 'pending') || null
    : null;

  const playerBalance = playerIndex !== null ? tournament.players[playerIndex]?.balance ?? 0 : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <button onClick={() => navigate('/blitz')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary,
            display: 'flex', alignItems: 'center',
          }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <h1 style={{
            ...typeScale.title, color: colors.text, margin: 0,
            display: 'flex', alignItems: 'center', gap: spacing.sm,
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {tournament.name}
          </h1>

          <div style={{ display: 'flex', gap: spacing.xs }}>
            <button onClick={handleShare} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary,
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            {isCreator && (
              <button onClick={handleReset} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: colors.destructive,
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: spacing.lg }}>
          {activeTab === 'match' && (
            <>
              <BlitzMatchTab
                tournament={tournament} rounds={rounds} isCreator={isCreator}
                timerProps={timerProps} onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer} onResetTimer={handleResetTimer}
                onSubmitScore={handleSubmitScore} onBetClick={() => {}}
              />
              {/* Betting card for resting players */}
              {currentSchedule && playerIndex !== null && (
                <div style={{ marginTop: spacing.lg }}>
                  <BlitzBettingCard
                    tournament={tournament}
                    currentSchedule={currentSchedule}
                    playerIndex={playerIndex}
                    playerBalance={playerBalance}
                    existingBet={existingBet}
                    bets={bets}
                    onPlaceBet={handlePlaceBet}
                  />
                </div>
              )}
            </>
          )}
          {activeTab === 'leaderboard' && (
            <BlitzLeaderboard players={sortedPlayers} rounds={rounds} bets={bets} schedule={tournament.schedule} />
          )}
          {activeTab === 'calendar' && (
            <BlitzCalendarTab tournament={tournament} rounds={rounds} />
          )}
        </div>

        {/* Bottom Nav */}
        <DeucyBottomNav
          activeTab={activeTab}
          onTabChange={(tab) => { if (tab === "home") navigate("/blitz"); else setActiveTab(tab); }}
        />
      </div>
    </div>
  );
}
