import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useBlitzRealtime } from '@/hooks/useBlitzRealtime';
import { useBlitzIdentity } from '@/hooks/useBlitzIdentity';
import { useBlitzTimer } from '@/hooks/useBlitzTimer';
import {
  startTournament, startTimer, pauseTimer, resetTimer,
  submitScore, placeBet, cancelBet, editScore, reorderRound, deleteTournament, renameTournament,
  beginSetup, updateAnnouncement, BlitzPlayer,
  getRsvps, setRsvp, clearRsvp, subscribeRsvps, BlitzRsvp,
} from '@/services/blitzService';
import { generateSchedule } from '@/lib/blitz-schedule';
import { finalizeRanking, getRanking } from '@/services/rankingService';
import { colors, spacing, radius, fonts, typeScale, animationCSS } from '@/lib/design-tokens';
import { DeucyBottomNav, type DeucyTab } from '@/components/ui/deucy';
import BlitzSetup from '@/components/blitz/BlitzSetup';
import BlitzMatchTab from '@/components/blitz/BlitzMatchTab';
import BlitzCalendarTab from '@/components/blitz/BlitzCalendarTab';
import BlitzLeaderboard from '@/components/blitz/BlitzLeaderboard';
import BlitzBettingCard from '@/components/blitz/BlitzBettingCard';
import { BETTING_ENABLED } from '@/lib/feature-flags';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const { playerIndex, isCreator, isPoolHost, deviceId, isSpectator, isLoggedIn, globalPlayer } = useBlitzIdentity(id, tournament?.created_by ?? null, stablePlayers);

  // RSVPs for Save the Date. Only loaded when status='announced' — for
  // live/finished tournaments this stays empty and the realtime sub never
  // mounts. Re-fetches on any change via subscribeRsvps.
  const [rsvps, setRsvps] = useState<BlitzRsvp[]>([]);
  useEffect(() => {
    if (!id || tournament?.status !== 'announced') return;
    let cancelled = false;
    const load = async () => {
      const { data } = await getRsvps(id);
      if (!cancelled) setRsvps(data);
    };
    load();
    const ch = subscribeRsvps(id, load);
    return () => { cancelled = true; ch.unsubscribe(); };
  }, [id, tournament?.status]);

  // Local-only flag: host has tapped "Start setup" on an announced
  // tournament. We render BlitzSetup IN PLACE without flipping the DB
  // status, so the tournament keeps its "Save the date" identity until
  // the host actually completes setup and starts the tournament (which
  // is when status flips directly: announced → live).
  // If the host taps Back, we just unset this flag — zero side effects.
  const [setupActive, setSetupActive] = useState(false);

  // canSetup: who can advance an 'announced' tournament into setup, or
  // continue the wizard on a 'setup' tournament started by someone else.
  // Andrea's call (2026-05-19): RSVP-yes can do it, plus the original
  // creator. For tournaments born directly in 'setup' (no Save the Date),
  // RSVP list doesn't exist → fall back to any logged-in user, so a
  // teammate can pick up a setup that the creator started but didn't
  // finish. Pool-host (post-setup) is handled separately via isPoolHost.
  const inRsvpYes = !!globalPlayer && rsvps.some(
    r => r.player_id === globalPlayer.playerId && r.response === 'yes'
  );
  const canSetup = isCreator
    || (tournament?.status === 'announced' && inRsvpYes)
    || (tournament?.status === 'setup' && isLoggedIn);

  const myRsvp = globalPlayer
    ? rsvps.find(r => r.player_id === globalPlayer.playerId) || null
    : null;
  // Anyone in the tournament pool can rename / submit / edit. Pure
  // spectators (no playerIndex) cannot.
  const canSubmit = playerIndex !== null;
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

  const handleStart = async (
    config: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number },
    names: string[],
    playerIds?: Array<string | null>,
    isGuests?: boolean[],
    courts: 1 | 2 = 1,
  ) => {
    if (!id) return;
    // Guest players: ad-hoc names with player_id=null and isGuest=true.
    // They play the tournament fully but `finalizeRanking` skips them
    // when writing ranking_entries — they don't enter the global pool.
    const players = names.map((n, i) => ({
      name: n.trim(),
      balance: 10,
      player_id: playerIds?.[i] || null,
      isGuest: isGuests?.[i] === true ? true : undefined,
    }));

    // Identify the top-2 AND bot-2 globally-ranked players inside THIS
    // tournament's pool. The schedule generator will keep BOTH pairs on
    // opposite teams every round (hard constraint — splits that would
    // pair them up are excluded outright).
    //
    // Why both:
    //   - top-2: stays competitive, no super-team dominating
    //   - bot-2: no team is too weak, every match is balanced
    //
    // Guard (same logic for both): the constraint only kicks in when
    // BOTH members of the pair have actually played at least one
    // tournament (rankingScore > 0). Otherwise we'd "label" new players
    // as bot before they had a chance to prove themselves, and the
    // top-pair would be arbitrary on a brand-new pool.
    const avoidPairs: Array<[number, number]> = [];
    try {
      const { data: ranking } = await getRanking();
      if (ranking && ranking.length > 0) {
        const ranked = players.map((p, idx) => {
          const r = p.player_id ? ranking.find(x => x.playerId === p.player_id) : null;
          return { idx, score: r?.rankingScore ?? 0 };
        }).sort((a, b) => b.score - a.score);
        // Top-2: highest-ranked two players in the pool
        if (ranked.length >= 2 && ranked[0].score > 0 && ranked[1].score > 0) {
          avoidPairs.push([ranked[0].idx, ranked[1].idx]);
        }
        // Bot-2: lowest-ranked two players in the pool (symmetric to top)
        if (ranked.length >= 4) {
          const last = ranked[ranked.length - 1];
          const secondLast = ranked[ranked.length - 2];
          if (last.score > 0 && secondLast.score > 0) {
            avoidPairs.push([last.idx, secondLast.idx]);
          }
        }
      }
    } catch (e) {
      console.warn('[handleStart] could not fetch ranking for pair constraints', e);
    }

    const schedule = generateSchedule(names.length, config.totalRounds, avoidPairs, courts);
    const { error } = await startTournament(id, config, players, schedule, courts);
    if (error) toast({ title: 'Error starting', description: error, variant: 'destructive' });
    else {
      toast({ title: 'Tournament started!' });
      refetch();
    }
  };

  const handleStartTimer = async () => {
    if (!id || !tournament) return;
    const dur = timerProps.isPaused && tournament.timer_paused_remaining
      ? tournament.timer_paused_remaining : tournament.round_duration_seconds;
    await startTimer(id, dur);
  };

  const handlePauseTimer = async () => { if (id) await pauseTimer(id, Math.ceil(timerProps.secondsLeft)); };
  const handleResetTimer = async () => { if (id && tournament) await resetTimer(id, tournament.round_duration_seconds); };

  const handleSubmitScore = async (scoreA: number, scoreB: number, court?: 'A' | 'B') => {
    if (!id || !tournament) return;
    const round = rounds.find(r => r.round_index === tournament.current_round);
    if (!round) return;
    const { error } = await submitScore(id, round.id, round.round_index, scoreA, scoreB, tournament, bets, court);
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

  // Delete tournament dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  // Quick delete for setup-phase tournaments — no secret code required
  // (the tournament is still being created, mistakes are common, no
  // ranking data to lose). Only exposed in the Setup view header.
  const [quickDeleteOpen, setQuickDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inline rename state — tap the title to edit, Enter/blur to save,
  // Esc to cancel. Anyone in the tournament pool can rename.
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const handleStartRename = () => {
    if (!tournament) return;
    setDraftName(tournament.name);
    setIsEditingName(true);
  };

  const handleSaveRename = async () => {
    if (!id || !tournament) return;
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === tournament.name) {
      setIsEditingName(false);
      return;
    }
    setRenaming(true);
    const { error } = await renameTournament(id, trimmed);
    setRenaming(false);
    setIsEditingName(false);
    if (error) {
      toast({ title: 'Could not rename', description: error, variant: 'destructive' });
    }
  };

  const handleCancelRename = () => {
    setIsEditingName(false);
    setDraftName('');
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    await deleteTournament(id);
    setDeleting(false);
    setDeleteOpen(false);
    setDeleteCode('');
    navigate('/blitz');
  };

  // Quick delete from the Setup view — no secret code, single confirmation.
  // Safe because nothing has been finalized yet (no ranking_entries, no
  // completed rounds, no balances earned).
  const handleQuickDelete = async () => {
    if (!id) return;
    setDeleting(true);
    await deleteTournament(id);
    setDeleting(false);
    setQuickDeleteOpen(false);
    navigate('/blitz');
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



  // ── Save the Date (status = 'announced') ──
  // Tournament is locked in calendar form: date, time, location are
  // visible to everyone. Only the host (isCreator) can edit the metadata
  // or open the setup view.
  //
  // setupActive (local state): when the host taps "Start setup" we DON'T
  // flip the DB status — we just show BlitzSetup inline. The tournament
  // stays "announced" in the home list and on other devices. Status flips
  // only when the host completes setup and presses Start (announced →
  // live, skipping 'setup' as a persisted state). This means: if the host
  // backs out of setup, nothing has changed and the Save the Date is
  // intact. Fixes the bug where "Start setup" left a 0-player limbo
  // tournament if not completed.
  if (tournament.status === 'announced' && !setupActive) {
    const sched = tournament.scheduled_at ? new Date(tournament.scheduled_at) : null;
    const dateLong = sched
      ? sched.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : null;
    const timeStr = sched
      ? sched.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      : null;
    const goingRsvps = rsvps.filter(r => r.response === 'yes');
    const declinedRsvps = rsvps.filter(r => r.response === 'no');

    return (
      <AnnouncedView
        tournament={tournament}
        isCreator={isCreator}
        canSetup={canSetup}
        isLoggedIn={isLoggedIn}
        dateLong={dateLong}
        timeStr={timeStr}
        rsvps={rsvps}
        goingRsvps={goingRsvps}
        declinedRsvps={declinedRsvps}
        myRsvp={myRsvp}
        onSetRsvp={async (response) => {
          if (!id || !globalPlayer) return;
          const { error } = await setRsvp(id, globalPlayer.playerId, response);
          if (error) toast({ title: 'Could not save', description: error, variant: 'destructive' });
        }}
        onClearRsvp={async () => {
          if (!id || !globalPlayer) return;
          await clearRsvp(id, globalPlayer.playerId);
        }}
        onBack={() => navigate('/blitz')}
        onBeginSetup={async () => {
          if (!id) return;
          // Pre-load the "going" RSVPs into setup. The host can still
          // edit the list in BlitzSetup before pressing Start. We pass
          // the names through localStorage as a tiny one-shot handoff —
          // BlitzSetup picks them up on mount and clears the slot.
          if (goingRsvps.length > 0) {
            try {
              const handoff = goingRsvps.map(r => ({
                player_id: r.player_id,
                name: r.display_name || 'Player',
              }));
              localStorage.setItem(`deucy-prefill-${id}`, JSON.stringify(handoff));
            } catch { /* localStorage full or disabled — non-fatal */ }
          }
          // Open BlitzSetup inline — no DB write. Status stays 'announced'.
          // The host can back out without leaving a half-configured shell.
          setSetupActive(true);
          if (goingRsvps.length > 0) {
            toast({ title: `${goingRsvps.length} RSVP players added` });
          }
        }}
        onUpdate={async (patch) => {
          if (!id) return { error: 'NO_ID' as const };
          const { error } = await updateAnnouncement(id, patch);
          if (error) toast({ title: 'Could not save', description: error, variant: 'destructive' });
          else { toast({ title: 'Saved' }); refetch(); }
          return { error };
        }}
        onDelete={() => setDeleteOpen(true)}
        deleteOpen={deleteOpen}
        onDeleteClose={() => { setDeleteOpen(false); setDeleteCode(''); }}
        deleteCode={deleteCode}
        setDeleteCode={setDeleteCode}
        deleting={deleting}
        onConfirmDelete={handleDelete}
      />
    );
  }

  // Setup — either a tournament directly created in 'setup' (no announce),
  // OR an announced tournament where the host has tapped Start setup
  // (setupActive=true). Two slightly different "Back" behaviors:
  //  - direct setup → Back goes to /blitz home
  //  - announced + setupActive → Back returns to the AnnouncedView (just
  //    flips the local flag, no DB change)
  const inSetupView = tournament.status === 'setup' || (tournament.status === 'announced' && setupActive);
  if (inSetupView) {
    const fromAnnounced = tournament.status === 'announced';
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
        <div style={{ maxWidth: 430, margin: '0 auto', padding: spacing.lg }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.lg,
          }}>
            <button
              onClick={() => fromAnnounced ? setSetupActive(false) : navigate('/blitz')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: spacing.xs,
                color: colors.textSecondary, fontSize: 14, fontWeight: 600,
                fontFamily: fonts.sans,
                padding: 0,
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {fromAnnounced ? 'Back to Save the Date' : 'Back'}
            </button>

            {/* Quick delete — only for direct-setup tournaments (no Save
                the Date yet). Mistakes during creation are common: typo
                in name, wrong day, accidental tap on +. No secret code
                needed because nothing has been finalized. The announced
                branch already has its own delete in AnnouncedView. */}
            {!fromAnnounced && canSetup && (
              <button
                onClick={() => setQuickDeleteOpen(true)}
                aria-label="Delete tournament"
                title="Delete tournament"
                style={{
                  background: 'none',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  cursor: 'pointer',
                  color: colors.muted,
                  width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
          </div>
          {canSetup ? (
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

        {/* Quick-delete dialog — no secret code, just a confirm. */}
        <AlertDialog open={quickDeleteOpen} onOpenChange={(v) => { if (!v) setQuickDeleteOpen(false); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{tournament?.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This tournament hasn&apos;t started yet, so nothing will be lost. The action can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleQuickDelete}
                disabled={deleting}
                style={{ backgroundColor: colors.destructive, color: '#fff' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

          {isEditingName ? (
            <input
              autoFocus
              value={draftName}
              disabled={renaming}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSaveRename(); }
                else if (e.key === 'Escape') { e.preventDefault(); handleCancelRename(); }
              }}
              style={{
                flex: 1,
                background: colors.bg,
                border: `1px solid ${colors.primary}`,
                borderRadius: radius.sm,
                color: colors.text,
                fontFamily: fonts.sans, fontSize: 16, fontWeight: 700,
                padding: `${spacing.xs}px ${spacing.sm}px`,
                outline: 'none',
                textAlign: 'center',
                margin: `0 ${spacing.sm}px`,
              }}
              maxLength={40}
            />
          ) : (
            <h1
              onClick={canSubmit ? handleStartRename : undefined}
              style={{
                ...typeScale.title, color: colors.text, margin: 0,
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                cursor: canSubmit ? 'pointer' : 'default',
                userSelect: 'none',
              }}
              title={canSubmit ? 'Tap to rename' : undefined}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {tournament.name}
            </h1>
          )}

          <div style={{ display: 'flex', gap: spacing.xs }}>
            <button
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete tournament"
              title="Delete tournament"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: colors.muted,
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: spacing.lg }}>
          <ErrorBoundary key={activeTab} label={`tab:${activeTab}`}>
          {activeTab === 'match' && (
            <>
              <BlitzMatchTab
                tournament={tournament} rounds={rounds} isCreator={isPoolHost}
                playerIndex={playerIndex} bets={bets}
                timerProps={timerProps} onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer} onResetTimer={handleResetTimer}
                onSubmitScore={handleSubmitScore} onEditScore={handleEditScore} onBetClick={() => {}}
              />
              {/* Betting card for resting players — gated behind
                  BETTING_ENABLED feature flag (paused 2026-06-01). */}
              {BETTING_ENABLED && currentSchedule && playerIndex !== null && (
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
              isCreator={isPoolHost}
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

      {/* Delete dialog — secret code gate */}
      <AlertDialog open={deleteOpen} onOpenChange={(v) => { if (!v) { setDeleteOpen(false); setDeleteCode(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{tournament?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {tournament?.status === 'finished'
                ? 'This tournament has ranking data. Deleting it will recalculate the overall ranking for all players.'
                : 'This will permanently remove the tournament.'}
              {' '}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ padding: '0 24px' }}>
            <p style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>
              Enter the secret code to confirm
            </p>
            <input
              type="text"
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value)}
              placeholder="Secret code"
              autoComplete="off"
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: radius.sm, color: colors.text,
                fontSize: 14, fontFamily: fonts.mono, fontWeight: 600,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteCode('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || deleteCode !== 'Valencia2026'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              style={{ opacity: deleteCode === 'Valencia2026' ? 1 : 0.4 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── AnnouncedView ──
//
// Save the Date screen. Shows date / time / location prominently and
// gives the host a single primary action ("Start setup") that flips the
// tournament to status='setup'. Non-host players see the same calendar
// view but read-only.
//
// Edit affordance: tap-to-edit on date/time/location fields, host only.
// We keep this inline (no separate route) because the view is small and
// editing is a rare host action.

interface AnnouncedViewProps {
  tournament: { id: string; name: string; scheduled_at: string | null; location: string | null; location_url: string | null; created_by: string | null; };
  isCreator: boolean;
  canSetup: boolean;
  isLoggedIn: boolean;
  dateLong: string | null;
  timeStr: string | null;
  rsvps: BlitzRsvp[];
  goingRsvps: BlitzRsvp[];
  declinedRsvps: BlitzRsvp[];
  myRsvp: BlitzRsvp | null;
  onSetRsvp: (response: 'yes' | 'no') => Promise<void>;
  onClearRsvp: () => Promise<void>;
  onBack: () => void;
  onBeginSetup: () => Promise<void>;
  onUpdate: (patch: { name?: string; scheduledAt?: string | null; location?: string | null; locationUrl?: string | null }) => Promise<{ error: string | null }>;
  onDelete: () => void;
  deleteOpen: boolean;
  onDeleteClose: () => void;
  deleteCode: string;
  setDeleteCode: (s: string) => void;
  deleting: boolean;
  onConfirmDelete: () => void;
}

// ── ICS file builder ──
//
// Generates a minimal iCalendar (RFC 5545) string for the tournament.
// Returned as a data: URL so we don't need a fetch — the link element's
// download attribute does the rest. Works on iOS Safari, Android Chrome,
// macOS, Windows. The user gets an .ics file; tapping it on mobile opens
// the system "Add to Calendar" sheet.
//
// Date format: UTC, basic format (YYYYMMDDTHHMMSSZ). 90-minute default
// duration when no end time is known — close enough for a Blitz.
function buildICS(t: { id: string; name: string; scheduled_at: string | null; location: string | null }): string {
  if (!t.scheduled_at) return '';
  const start = new Date(t.scheduled_at);
  if (isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + 90 * 60 * 1000); // +90 min
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deucy//Padel//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:deucy-${t.id}@deucy.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escape(t.name)}`,
    t.location ? `LOCATION:${escape(t.location)}` : '',
    `DESCRIPTION:${escape(`Padel tournament — open in app: ${window.location.origin}/blitz/${t.id}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
}

// ── WhatsApp share message ──
//
// Builds the pre-filled message that pops in WhatsApp when the host taps
// "Share on WhatsApp". Optimized for tap-through to the app: emoji
// prefixes scan fast, bold title hooks the eye, single primary URL gets
// the link preview, optional Maps link below for "where do I go".
//
// WhatsApp formatting hints used:
//  - *text* → bold
//  - _text_ → italic
//  - blank lines → separator (renders as actual spacing)
//
// Preview rules: WA shows the rich preview for the FIRST URL it finds in
// the message, so the deucy link goes BEFORE the Maps URL. The deucy
// preview (if we ever add OG tags) will show up; otherwise it's a plain
// link, still clearly the primary action.
function buildWhatsAppShareHref(
  tournament: { id: string; name: string; location: string | null; location_url: string | null },
  dateLong: string | null,
  timeStr: string | null,
): string {
  // Emoji-led layout. WhatsApp passes UTF-8 bytes through to recipients
  // unchanged: iOS and modern Android render the emoji properly. A small
  // fraction of recipients (very old Android, broken/missing emoji font)
  // will see ◆ tofu — Andrea reported this on his own draft. We accept
  // the tradeoff because the iconic prefixes are recognized instantly
  // by the majority. WhatsApp markdown (*bold*) supported everywhere.
  //
  // Emoji choice (all Unicode 6.0–7.0, in standard sets since ~2010):
  //   🎾  tennis ball   — sport identity, opener
  //   📅  calendar      — when
  //   📍  round pushpin — where
  //   👉  pointer       — call to action
  //   🗺  world map     — directions / external destination
  const lines: string[] = [];
  lines.push(`🎾 *${tournament.name}*`);
  lines.push(''); // separator
  if (dateLong) {
    lines.push(`📅 ${dateLong}${timeStr ? ` · ${timeStr}` : ''}`);
  } else {
    lines.push('📅 Date TBD');
  }
  if (tournament.location) {
    lines.push(`📍 ${tournament.location}`);
  }
  lines.push(''); // separator
  lines.push("👉 Are you in? Tap to confirm — see who's coming too:");
  lines.push(`${window.location.origin}/blitz/${tournament.id}`);
  // Maps URL goes LAST so WA's preview latches onto the deucy link
  // (the primary action), not the map.
  if (tournament.location_url) {
    lines.push('');
    lines.push(`🗺 Directions:`);
    lines.push(tournament.location_url);
  }
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}

// ── Google Calendar deep link ──
//
// Same event, but as a Google Calendar "Add event" URL. Useful as a
// secondary option for users on Android/Web who prefer GCal over the
// system handler.
function buildGoogleCalUrl(t: { id: string; name: string; scheduled_at: string | null; location: string | null }): string {
  if (!t.scheduled_at) return '';
  const start = new Date(t.scheduled_at);
  if (isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: t.name,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Padel tournament — open in app: ${window.location.origin}/blitz/${t.id}`,
  });
  if (t.location) params.set('location', t.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function AnnouncedView(props: AnnouncedViewProps) {
  const {
    tournament, isCreator, canSetup, isLoggedIn, dateLong, timeStr,
    goingRsvps, declinedRsvps, myRsvp, onSetRsvp, onClearRsvp,
    onBack, onBeginSetup, onUpdate, onDelete,
    deleteOpen, onDeleteClose, deleteCode, setDeleteCode, deleting, onConfirmDelete,
  } = props;

  // Calendar links — generated only when there's actually a date set.
  const icsHref = tournament.scheduled_at ? buildICS(tournament) : '';
  const googleCalHref = tournament.scheduled_at ? buildGoogleCalUrl(tournament) : '';

  // Platform detection: iOS gets the .ics route (opens Apple Calendar
  // natively when tapped in Safari), everyone else gets the Google
  // Calendar deep link (avoids the awkward "downloaded a file, now find
  // it" flow on Android, opens GCal app or web directly).
  const isIOS = typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const calendarHref = isIOS ? icsHref : googleCalHref;
  const calendarDownload = isIOS
    ? `${tournament.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`
    : undefined;

  const goingNames = goingRsvps.map(r => r.display_name || 'Player');
  const declinedNames = declinedRsvps.map(r => r.display_name || 'Player');

  // Date components for the hero "ticket" card
  const sched = tournament.scheduled_at ? new Date(tournament.scheduled_at) : null;
  const monthShort = sched ? sched.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : null;
  const dayNum = sched ? sched.getDate() : null;
  const dayOfWeek = sched ? sched.toLocaleDateString('en-US', { weekday: 'long' }) : null;

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(tournament.name);
  const [draftDate, setDraftDate] = useState(() => {
    if (!tournament.scheduled_at) return '';
    const d = new Date(tournament.scheduled_at);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [draftTime, setDraftTime] = useState(() => {
    if (!tournament.scheduled_at) return '';
    const d = new Date(tournament.scheduled_at);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [draftLocation, setDraftLocation] = useState(tournament.location ?? '');
  const [draftLocationUrl, setDraftLocationUrl] = useState(tournament.location_url ?? '');
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleSave = async () => {
    let scheduledAt: string | null = null;
    if (draftDate && draftTime) {
      const d = new Date(`${draftDate}T${draftTime}`);
      if (!isNaN(d.getTime())) scheduledAt = d.toISOString();
    } else if (draftDate) {
      const d = new Date(`${draftDate}T19:00`);
      if (!isNaN(d.getTime())) scheduledAt = d.toISOString();
    }
    setSaving(true);
    await onUpdate({
      name: draftName.trim() || tournament.name,
      scheduledAt,
      location: draftLocation.trim() || null,
      locationUrl: draftLocationUrl.trim() || null,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        {/* Header — back + delete (host) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary,
            display: 'flex', alignItems: 'center',
          }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{
            ...typeScale.micro, color: colors.accent, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: spacing.xs,
          }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Save the date
          </span>
          {isCreator ? (
            <button
              onClick={onDelete}
              aria-label="Delete tournament"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: colors.muted,
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          ) : (<div style={{ width: 36 }} />)}
        </div>

        {/* Body */}
        <div style={{ padding: spacing.lg }}>
          {/* Tournament name */}
          {editing ? (
            <input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              maxLength={40}
              style={{
                width: '100%', padding: spacing.md,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.accent}`,
                borderRadius: radius.sm,
                color: colors.text,
                fontSize: 22, fontWeight: 800, fontFamily: fonts.sans,
                outline: 'none', boxSizing: 'border-box',
                marginBottom: spacing.lg,
              }}
            />
          ) : (
            <h1 style={{
              ...typeScale.title, color: colors.text, margin: 0,
              fontSize: 26, marginBottom: spacing.lg, fontWeight: 800,
            }}>
              {tournament.name}
            </h1>
          )}

          {/* ── Hero "Event Ticket" card ──
              Single composition replacing the old When/Where/Calendar
              triad. Treat it like a paper ticket stub: month label up top
              as a serial banner, big mono day number as the visual anchor,
              day-of-week + time as supporting copy, then a thin perforation
              divider, then the location pinned with an icon, then the
              calendar link as a tertiary inline action. Subtle stamp in
              the upper-right corner ("SAVE THE DATE") rotated a few
              degrees gives the page a unique signature without competing
              with the data. */}
          <div style={{
            position: 'relative',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            padding: `${spacing.xl}px ${spacing.lg}px ${spacing.lg}px`,
            marginBottom: spacing.xxl,
            overflow: 'hidden',
          }}>
            {/* Top accent stripe */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${colors.accent}, rgba(245,158,11,0.2))`,
            }} />

            {/* Decorative stamp — only when there's a date set */}
            {sched && !editing && (
              <div style={{
                position: 'absolute', top: 14, right: 12,
                transform: 'rotate(4deg)',
                border: `1px dashed ${colors.accent}`,
                color: colors.accent,
                padding: '3px 8px',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontFamily: fonts.sans,
                opacity: 0.75,
                pointerEvents: 'none',
              }}>
                Save the date
              </div>
            )}

            {editing ? (
              /* Edit mode — date + time inputs side by side */
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <input
                  type="date"
                  value={draftDate}
                  onChange={e => setDraftDate(e.target.value)}
                  style={{
                    flex: 1, padding: spacing.sm,
                    backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm, color: colors.text,
                    fontSize: 14, fontFamily: fonts.sans, outline: 'none',
                    boxSizing: 'border-box', colorScheme: 'dark',
                  }}
                />
                <input
                  type="time"
                  value={draftTime}
                  onChange={e => setDraftTime(e.target.value)}
                  style={{
                    width: 110, padding: spacing.sm,
                    backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm, color: colors.text,
                    fontSize: 14, fontFamily: fonts.sans, outline: 'none',
                    boxSizing: 'border-box', colorScheme: 'dark',
                  }}
                />
              </div>
            ) : (
              /* Display mode — big day number hero */
              <>
                {monthShort && (
                  <div style={{
                    fontFamily: fonts.mono, fontSize: 12, fontWeight: 700,
                    color: colors.accent, letterSpacing: '0.18em',
                    marginBottom: 4,
                  }}>
                    {monthShort}
                  </div>
                )}
                {dayNum !== null ? (
                  <div style={{
                    fontFamily: fonts.sans, fontSize: 64, fontWeight: 900,
                    color: colors.text, lineHeight: 0.9,
                    letterSpacing: '-0.04em',
                    marginBottom: spacing.xs,
                  }}>
                    {dayNum}
                  </div>
                ) : (
                  <div style={{ fontSize: 18, fontWeight: 700, color: colors.muted, marginBottom: spacing.xs }}>
                    Date to be confirmed
                  </div>
                )}
                {dayOfWeek && (
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: colors.text,
                  }}>
                    {dayOfWeek}{timeStr ? <> · {timeStr}</> : null}
                  </div>
                )}
              </>
            )}

            {/* Perforation divider — light dashed line */}
            <div style={{
              height: 0,
              borderTop: `1px dashed ${colors.borderLight}`,
              margin: `${spacing.lg}px -${spacing.lg}px`,
            }} />

            {/* Location row with pin icon + optional Maps link.
                Edit mode: location text input + URL input below. The URL
                is shown in mono so it's obvious it's a URL field. */}
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                <input
                  type="text"
                  value={draftLocation}
                  onChange={e => setDraftLocation(e.target.value)}
                  placeholder="Add location"
                  style={{
                    width: '100%', padding: spacing.sm,
                    backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm, color: colors.text,
                    fontSize: 14, fontFamily: fonts.sans, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="url"
                  inputMode="url"
                  value={draftLocationUrl}
                  onChange={e => setDraftLocationUrl(e.target.value)}
                  placeholder="Maps link (optional)"
                  style={{
                    width: '100%', padding: spacing.sm,
                    backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm, color: colors.text,
                    fontSize: 12, fontFamily: fonts.mono, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ) : (
              /* Location row — when we have ANY location text (URL or no
                 URL), the whole row is a single tap target that opens
                 Maps. Visual affordance follows the link-in-prose
                 convention: dashed underline beneath the text + small
                 superscript ↗ arrow. The pin icon stays as a label, the
                 underline + arrow tell you it's interactive. Without
                 location text we fall back to a non-interactive muted
                 placeholder. Priority: explicit URL > Google Maps search
                 fallback on the location text. */
              tournament.location ? (
                <a
                  href={
                    tournament.location_url ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tournament.location)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: spacing.sm,
                    color: colors.text, textDecoration: 'none',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span style={{
                    fontSize: 15, fontWeight: 600, color: colors.text,
                    borderBottom: `1px dashed ${colors.muted}`,
                    paddingBottom: 1,
                  }}>
                    {tournament.location}
                  </span>
                  {/* Superscript external-link arrow — standard convention,
                      lifted slightly via negative margin-top so it reads as
                      annotation rather than punctuation. */}
                  <svg
                    width={10} height={10} viewBox="0 0 24 24"
                    fill="none" stroke={colors.accent}
                    strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
                    style={{ marginLeft: -4, marginTop: -8, flexShrink: 0 }}
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: spacing.sm,
                  fontSize: 15, fontWeight: 600, color: colors.muted,
                }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Location to be confirmed
                </div>
              )
            )}

            {/* Calendar link — single tertiary action at the bottom of
                the ticket. Platform-aware: iOS uses the .ics data URL
                (Apple Calendar native), Android + desktop use the
                Google Calendar deep link (no file download, opens GCal
                app or web with the event pre-filled). Hidden in edit
                mode and when no date set. */}
            {!editing && tournament.scheduled_at && calendarHref && (
              <div style={{
                marginTop: spacing.lg,
                paddingTop: spacing.md,
                borderTop: `1px solid ${colors.border}`,
              }}>
                <a
                  href={calendarHref}
                  download={calendarDownload}
                  target={isIOS ? undefined : '_blank'}
                  rel={isIOS ? undefined : 'noopener noreferrer'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: colors.accent, fontSize: 12, fontWeight: 700,
                    fontFamily: fonts.sans, textDecoration: 'none',
                    letterSpacing: '0.02em',
                  }}
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add to Calendar
                </a>
              </div>
            )}
          </div>{/* ── /Hero ticket ── */}

          {/* Host actions — RSVP-yes can also start the setup */}
          {canSetup ? (
            editing ? (
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <button
                  onClick={() => { setEditing(false);
                    setDraftName(tournament.name);
                    setDraftLocation(tournament.location ?? '');
                    setDraftLocationUrl(tournament.location_url ?? '');
                  }}
                  disabled={saving}
                  style={{
                    flex: 1, padding: `${spacing.md}px`,
                    background: 'transparent', color: colors.textSecondary,
                    border: `1px solid ${colors.border}`, borderRadius: radius.sm,
                    fontSize: 14, fontWeight: 700, fontFamily: fonts.sans,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, padding: `${spacing.md}px`,
                    background: colors.accent, color: '#000',
                    border: 'none', borderRadius: radius.sm,
                    fontSize: 14, fontWeight: 800, fontFamily: fonts.sans,
                    cursor: 'pointer', opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            ) : (
              <>
                {/* PRIMARY action — only one. The host's main goal here. */}
                <button
                  onClick={async () => { setStarting(true); await onBeginSetup(); setStarting(false); }}
                  disabled={starting}
                  style={{
                    width: '100%', padding: `${spacing.md + 4}px`,
                    background: colors.primary, color: '#000',
                    border: 'none', borderRadius: radius.sm,
                    fontSize: 16, fontWeight: 800, fontFamily: fonts.sans,
                    cursor: 'pointer', opacity: starting ? 0.6 : 1,
                    marginBottom: spacing.sm,
                    boxShadow: '0 6px 20px rgba(34,197,94,0.18)',
                  }}
                >
                  {starting ? 'Starting...' : 'Start setup →'}
                </button>

                {/* SECONDARY — WhatsApp share, outlined to clearly demote
                    its weight versus the primary CTA. Keeps the WA brand
                    color for recognition, but as border + text on dark. */}
                <a
                  href={buildWhatsAppShareHref(tournament, dateLong, timeStr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: spacing.sm,
                    width: '100%', padding: `${spacing.md}px`,
                    background: 'transparent', color: '#25D366',
                    border: `1px solid #25D366`, borderRadius: radius.sm,
                    fontSize: 14, fontWeight: 700, fontFamily: fonts.sans,
                    cursor: 'pointer', textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  Share on WhatsApp
                </a>

                {/* TERTIARY — Edit details as a small text link, centered.
                    Visually disappears unless the user actually looks for
                    it, which is the intent: editing is rare. */}
                <div style={{ textAlign: 'center', marginTop: spacing.md }}>
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: colors.textSecondary, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', padding: spacing.xs,
                      fontFamily: fonts.sans, textDecoration: 'underline',
                      textUnderlineOffset: 3,
                    }}
                  >
                    Edit details
                  </button>
                </div>
              </>
            )
          ) : (
            /* Non-host loggato: niente card "You're invited" (ridondante,
               sono arrivati da un link WhatsApp che li dichiara invitati,
               e il prompt "Will you play?" sotto è inequivocabile).
               Anonimi: solo hint soft per aprire dal proprio link
               personale, così possono effettivamente confermare. */
            !isLoggedIn ? (
              <div style={{
                marginBottom: spacing.md, textAlign: 'center',
                padding: `${spacing.sm}px ${spacing.md}px`,
              }}>
                <span style={{ fontSize: 12, color: colors.muted }}>
                  Already a deucy player? Open your personal invite link to RSVP.
                </span>
              </div>
            ) : null
          )}

          {/* RSVP block — visible to ANY logged-in user, including the host.
              Why host too: the host might organize but not actually play
              (delegated arrangements), and confirming "yes" puts their name
              in the public Going list (extra social proof). Two-state:
              pinned answer with Change link, or 2 buttons before answering. */}
          {isLoggedIn && (
            <div style={{ marginTop: canSetup ? spacing.xl : 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: colors.muted,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: spacing.sm,
                textAlign: 'center',
              }}>
                {myRsvp ? 'Your answer' : 'Will you play?'}
              </div>
              {myRsvp ? (
                <div style={{
                  background: myRsvp.response === 'yes' ? colors.primaryMuted : 'rgba(115,115,128,0.08)',
                  border: `1px solid ${myRsvp.response === 'yes' ? 'rgba(34,197,94,0.3)' : colors.border}`,
                  borderRadius: radius.md,
                  padding: `${spacing.md}px ${spacing.lg}px`,
                  marginBottom: spacing.md,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: spacing.sm,
                }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700,
                    color: myRsvp.response === 'yes' ? colors.text : colors.textSecondary,
                    display: 'flex', alignItems: 'center', gap: spacing.sm,
                  }}>
                    {myRsvp.response === 'yes' ? (
                      <>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        You're going
                      </>
                    ) : (
                      <>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        You can't make it
                      </>
                    )}
                  </div>
                  <button
                    onClick={onClearRsvp}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: colors.textSecondary, fontSize: 12, fontWeight: 600,
                      textDecoration: 'underline', padding: 0, fontFamily: fonts.sans,
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
                  <button
                    onClick={() => onSetRsvp('yes')}
                    style={{
                      flex: 1, padding: `${spacing.md + 2}px`,
                      background: colors.primary, color: '#000',
                      border: 'none', borderRadius: radius.sm,
                      fontSize: 14, fontWeight: 800, fontFamily: fonts.sans,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: spacing.xs,
                    }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    I'll be there
                  </button>
                  <button
                    onClick={() => onSetRsvp('no')}
                    style={{
                      flex: 1, padding: `${spacing.md + 2}px`,
                      background: 'transparent', color: colors.textSecondary,
                      border: `1px solid ${colors.border}`, borderRadius: radius.sm,
                      fontSize: 14, fontWeight: 700, fontFamily: fonts.sans,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: spacing.xs,
                    }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Can't make it
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Going list — visible to EVERYONE (host + invitees + anon).
              Social proof: seeing who's already in motivates others to
              confirm. Declined names are NOT shown publicly — only the
              host sees them, in the host-only summary above. */}
          <GoingList names={goingNames} />

          {/* Host-only RSVP summary — count of pending (not RSVPed) =
              total players in DB minus going minus declined. We don't
              have an "invited list", so pending = "no answer yet from
              registered players". */}
          {isCreator && (declinedNames.length > 0 || goingNames.length > 0) && (
            <DeclinedList names={declinedNames} />
          )}
        </div>
      </div>

      {/* Delete dialog — re-uses the parent's state */}
      <AlertDialog open={deleteOpen} onOpenChange={(v) => { if (!v) onDeleteClose(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{tournament.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the announcement. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ padding: '0 24px' }}>
            <p style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>
              Enter the secret code to confirm
            </p>
            <input
              type="text"
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value)}
              placeholder="Secret code"
              autoComplete="off"
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: radius.sm, color: colors.text,
                fontSize: 14, fontFamily: fonts.mono, fontWeight: 600,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteCode('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={deleting || deleteCode !== 'Valencia2026'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              style={{ opacity: deleteCode === 'Valencia2026' ? 1 : 0.4 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── RsvpRoster ──
//
// Compact section for the Going / Declined lists at the bottom of the
// AnnouncedView. No card chrome, no heavy borders — just a section title
// rule, a count chip, and the names as soft pills. Going uses primary
// green, declined uses muted neutral. Both empty → null.
//
// Visual rationale: the hero ticket card already carries the page's
// visual weight. The roster is supporting content; making it look like
// "another card" creates a stack of equal-weight blocks (the original
// problem). Strip-divider style keeps it readable without competing.
function RsvpRoster({
  variant, names, hostOnly,
}: {
  variant: 'going' | 'declined';
  names: string[];
  hostOnly?: boolean;
}) {
  if (names.length === 0) return null;
  const isGoing = variant === 'going';
  const tint = isGoing ? colors.primary : colors.muted;
  return (
    <div style={{ marginTop: spacing.xl }}>
      {/* Section header strip — thin top rule with a count chip
          straddling it. Reads like a section divider on a magazine page. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.md,
      }}>
        <div style={{ flex: 1, height: 1, background: colors.border }} />
        <span style={{
          fontSize: 10, fontWeight: 800, color: tint,
          textTransform: 'uppercase', letterSpacing: '0.16em',
          fontFamily: fonts.sans,
          padding: `2px 0`,
        }}>
          {isGoing ? 'Going' : "Can't make it"} · {names.length}
        </span>
        <div style={{ flex: 1, height: 1, background: colors.border }} />
      </div>

      {/* Optional host-only marker — small line under the divider */}
      {hostOnly && (
        <div style={{
          textAlign: 'center', fontSize: 10, color: colors.muted,
          fontWeight: 500, marginTop: -4, marginBottom: spacing.sm,
          fontFamily: fonts.sans, letterSpacing: '0.04em',
        }}>
          visible only to you
        </div>
      )}

      {/* Pills */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        justifyContent: 'center',
      }}>
        {names.map((n, i) => (
          <span key={i} style={{
            padding: `5px 11px`,
            background: isGoing ? colors.primaryMuted : 'transparent',
            border: `1px solid ${isGoing ? 'rgba(34,197,94,0.22)' : colors.border}`,
            borderRadius: radius.pill,
            fontSize: 13, fontWeight: 600,
            color: isGoing ? colors.text : colors.textSecondary,
            fontFamily: fonts.sans,
          }}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

// Backward-compat thin wrappers — let the existing call sites keep their
// names so we don't have to touch the AnnouncedView body.
function GoingList({ names }: { names: string[] }) {
  return <RsvpRoster variant="going" names={names} />;
}

function DeclinedList({ names }: { names: string[] }) {
  return <RsvpRoster variant="declined" names={names} hostOnly />;
}
