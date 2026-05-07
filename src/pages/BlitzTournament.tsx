import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useBlitzRealtime } from '@/hooks/useBlitzRealtime';
import { useBlitzIdentity } from '@/hooks/useBlitzIdentity';
import { useBlitzTimer } from '@/hooks/useBlitzTimer';
import {
  startTournament, startTimer, pauseTimer, resetTimer,
  submitScore, placeBet, cancelBet, resetTournament, editScore, reorderRound, BlitzPlayer,
} from '@/services/blitzService';
import { generateSchedule } from '@/lib/blitz-schedule';
import { finalizeRanking } from '@/services/rankingService';
import { colors, spacing, radius, fonts, typeScale, animationCSS } from '@/lib/design-tokens';
import { DeucyBottomNav, type DeucyTab } from '@/components/ui/deucy';
import BlitzSetup from '@/components/blitz/BlitzSetup';
import BlitzMatchTab from '@/components/blitz/BlitzMatchTab';
import BlitzCalendarTab from '@/components/blitz/BlitzCalendarTab';
import BlitzLeaderboard from '@/components/blitz/BlitzLeaderboard';
import BlitzBettingCard from '@/components/blitz/BlitzBettingCard';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function BlitzTournament() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tournament, rounds, bets, loading, error: realtimeError, refetch } = useBlitzRealtime(id);

  // Stabilize the players array reference passed to useBlitzIdentity.
  // tournament.players gets a new reference on every realtime UPDATE (the
  // parser rebuilds the array). useBlitzIdentity has it as a useEffect dep
  // and would fire identity recalculation on every refetch, which during
  // the cascade of updates at "submit last round" used to participate in a
  // re-render storm hitting React error #300 (max update depth exceeded).
  // Comparing by JSON keeps the same reference until the actual content
  // changes (player added / renamed / linked).
  const playersJson = tournament ? JSON.stringify(tournament.players) : '';
  const stablePlayers = useMemo(() => tournament?.players, [playersJson]);
  const { playerIndex, isCreator, deviceId, isSpectator } = useBlitzIdentity(id, tournament?.created_by ?? null, stablePlayers);
  const timerProps = useBlitzTimer(tournament);
  const [activeTab, setActiveTab] = useState<DeucyTab>('match');

  // Diagnostic: log every activeTab change so we can see in DevTools who
  // changed it (user click on bottom nav, or some auto-switch we missed).
  useEffect(() => {
    console.log(`[BlitzTournament] activeTab changed -> ${activeTab}`, {
      ts: new Date().toISOString(),
      tournamentStatus: tournament?.status,
      currentRound: tournament?.current_round,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  // Render-storm canary. If this component renders more than 200 times in
  // a 5s window, something is looping — log it once with a clue.
  const renderCountRef = useRef({ count: 0, t0: Date.now(), warned: false });
  renderCountRef.current.count++;
  if (!renderCountRef.current.warned) {
    const elapsed = Date.now() - renderCountRef.current.t0;
    if (renderCountRef.current.count > 200 && elapsed < 5000) {
      renderCountRef.current.warned = true;
      console.error('[BlitzTournament] render storm detected', {
        count: renderCountRef.current.count,
        elapsedMs: elapsed,
        tournamentStatus: tournament?.status,
        currentRound: tournament?.current_round,
        totalRounds: tournament?.total_rounds,
        activeTab,
      });
    } else if (elapsed > 5000) {
      // reset window
      renderCountRef.current = { count: 1, t0: Date.now(), warned: false };
    }
  }

  // Default tab is always Match. For live tournaments that's the round
  // you're playing. For finished tournaments that's the celebration
  // screen (trophy + confetti + ranking points). Users can still switch
  // to Standings or Schedule via the bottom nav.
  // (No tab switching effect needed — useState default already covers it.)
  
  // ── Handlers ──

  const handleStart = async (config: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }, names: string[], playerIds?: string[]) => {
    if (!id) return;
    const players = names.map((n, i) => ({ name: n.trim(), balance: 10, player_id: playerIds?.[i] || null }));
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
    if (error) {
      // Soft handling: another player beat us to it. Realtime will update
      // the UI. Don't show a destructive toast — the round-change watcher
      // in BlitzMatchTab already informs the user.
      if (error === 'ALREADY_COMPLETED') {
        return; // realtime subscriptions will pull the new state
      }
      toast({ title: 'Error', description: error, variant: 'destructive' });
      return;
    }

    const isLast = tournament.current_round >= tournament.total_rounds;
    if (isLast) {
      // Stay on the Match tab — that's where the celebration screen
      // lives (confetti, trophy, ranking points). User can still switch
      // to Standings via the bottom nav if they want the table view.
      const rankResult = await finalizeRanking(tournament, rounds, bets);
      if (rankResult?.error) console.warn('Ranking finalization:', rankResult.error);
      toast({ title: 'Tournament complete!' });
      // No explicit refetch: subscribeTournament + subscribeRounds +
      // subscribeBets already deliver fresh data within ~500ms. Calling
      // refetch here would stack a redundant Promise.all of setState
      // calls on top of the realtime burst and was contributing to the
      // re-render storm that triggered React #300.
      return;
    }

    toast({ title: `Round ${tournament.current_round} done!` });
    // For non-last rounds we still benefit from a refetch as a belt-and-
    // suspenders sync, since the cascade is small and realtime alone
    // sometimes has a noticeable lag for rounds.
    refetch();
  };

  const handleEditScore = async (roundId: string, roundIndex: number, scoreA: number, scoreB: number) => {
    if (!id || !tournament) return;
    const { error } = await editScore(id, roundId, roundIndex, scoreA, scoreB, tournament, bets, rounds);
    if (error) {
      if (error === 'EDIT_WINDOW_EXPIRED') {
        toast({
          title: 'Edit window closed',
          description: 'Scores can only be changed within 10 minutes of finishing the tournament.',
        });
        refetch();
        return;
      }
      toast({ title: 'Error', description: error, variant: 'destructive' });
      return;
    }
    // Re-finalize ranking if tournament is already finished
    if (tournament.status === 'finished') {
      await finalizeRanking(tournament);
    }
    toast({ title: `Round ${roundIndex} score updated!` });
    refetch();
  };

  const handlePlaceBet = async (prediction: 'A' | 'B', stake: number) => {
    if (!id || !tournament || playerIndex === null) return;
    const updated = [...tournament.players];
    updated[playerIndex] = { ...updated[playerIndex], balance: updated[playerIndex].balance - stake };
    const { error } = await placeBet(id, tournament.current_round, playerIndex, prediction, stake, updated);
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
    else { toast({ title: `Prediction placed: Team ${prediction}` }); refetch(); }
  };

  const handleCancelBet = async (betId: string, refundStake: number) => {
    if (!id || !tournament || playerIndex === null) return;
    const { error } = await cancelBet(id, betId, playerIndex, refundStake, tournament.players);
    if (error) {
      if (error === 'BET_ALREADY_SETTLED') {
        toast({ title: 'Too late', description: 'The round just closed — your bet is already settled.' });
        refetch();
        return;
      }
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Prediction cancelled', description: `€${refundStake} refunded.` });
      refetch();
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (!id || fromIndex === toIndex) return;
    const { error } = await reorderRound(id, fromIndex, toIndex);
    if (error) {
      const friendly =
        error === 'ROUND_COMPLETED' ? 'That round is already completed.' :
        error === 'TOURNAMENT_FINISHED' ? 'Tournament is finished — order cannot change.' :
        error === 'INVALID_INDEX' ? 'Invalid round.' :
        error;
      toast({ title: 'Cannot reorder', description: friendly, variant: 'destructive' });
      return;
    }
    toast({ title: `Round ${fromIndex} \u2192 position ${toIndex}` });
    refetch();
  };

  const handleReset = async () => {
    if (!id || !tournament) return;
    if (tournament.status === 'finished') {
      const code = window.prompt('This tournament is finished. Resetting will delete ranking data.\nEnter secret code to confirm:');
      if (code !== 'Valencia2026') {
        if (code !== null) toast({ title: 'Wrong code', variant: 'destructive' });
        return;
      }
    } else {
      const ok = window.confirm('Reset this tournament? All rounds and scores will be lost.');
      if (!ok) return;
    }
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
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: spacing.lg,
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {realtimeError ? (
          <>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.destructive} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ ...typeScale.body, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }}>
              {realtimeError}
            </span>
            <button onClick={() => { refetch(); }} style={{
              padding: `${spacing.sm}px ${spacing.xl}px`,
              background: colors.primary, color: '#000', border: 'none',
              borderRadius: radius.sm, fontFamily: fonts.sans, fontSize: 14,
              fontWeight: 700, cursor: 'pointer',
            }}>
              Retry
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: 36, height: 36, border: `3px solid ${colors.border}`,
              borderTopColor: colors.primary, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ ...typeScale.body, color: colors.muted }}>Loading tournament...</span>
          </>
        )}
      </div>
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
      <style>{animationCSS}</style>
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
          <ErrorBoundary key={activeTab} label={`tab:${activeTab}`}>
          {activeTab === 'match' && (
            <>
              <BlitzMatchTab
                tournament={tournament} rounds={rounds} isCreator={isCreator}
                playerIndex={playerIndex} bets={bets}
                timerProps={timerProps} onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer} onResetTimer={handleResetTimer}
                onSubmitScore={handleSubmitScore} onEditScore={handleEditScore} onBetClick={() => {}}
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
                    onCancelBet={handleCancelBet}
                  />
                </div>
              )}
            </>
          )}
          {activeTab === 'leaderboard' && (
            <BlitzLeaderboard
              players={sortedPlayers} rounds={rounds} bets={bets}
              schedule={tournament.schedule}
              myPlayerIndex={playerIndex}
            />
          )}
          {activeTab === 'calendar' && (
            <BlitzCalendarTab
              tournament={tournament} rounds={rounds}
              isCreator={isCreator}
              onReorder={handleReorder}
            />
          )}
          </ErrorBoundary>
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
