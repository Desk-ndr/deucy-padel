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
  const { playerIndex, isCreator, deviceId, isSpectator } = useBlitzIdentity(id, tournament?.created_by ?? null, stablePlayers);
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

  const handleStart = async (config: { totalRounds: number; gamesPerPlayer: number; roundDurationSeconds: number }, names: string[], playerIds?: string[]) => {
    if (!id) return;
    const players = names.map((n, i) => ({ name: n.trim(), balance: 10, player_id: playerIds?.[i] || null }));

    // Identify the top-2 globally-ranked players inside THIS tournament's
    // pool. The schedule generator will then keep them on opposite teams
    // every round (soft constraint, +1000 freshness penalty if same team).
    // Skip the constraint when neither / only one of them has actually
    // played a tournament yet (rankingScore > 0) — otherwise the rule
    // is arbitrary on a fresh pool of brand-new players.
    let avoidPair: [number, number] | null = null;
    try {
      const { data: ranking } = await getRanking();
      if (ranking && ranking.length > 0) {
        const ranked = players.map((p, idx) => {
          const r = p.player_id ? ranking.find(x => x.playerId === p.player_id) : null;
          return { idx, score: r?.rankingScore ?? 0 };
        }).sort((a, b) => b.score - a.score);
        if (ranked.length >= 2 && ranked[0].score > 0 && ranked[1].score > 0) {
          avoidPair = [ranked[0].idx, ranked[1].idx];
        }
      }
    } catch (e) {
      console.warn('[handleStart] could not fetch ranking for top-pair constraint', e);
    }

    const schedule = generateSchedule(names.length, config.totalRounds, avoidPair);
    const { error } = await startTournament(id, config, players, schedule);
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

  // Delete tournament dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
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
  // or flip status to 'setup' to begin configuring players.
  if (tournament.status === 'announced') {
    const sched = tournament.scheduled_at ? new Date(tournament.scheduled_at) : null;
    const dateLong = sched
      ? sched.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : null;
    const timeStr = sched
      ? sched.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      : null;
    return (
      <AnnouncedView
        tournament={tournament}
        isCreator={isCreator}
        dateLong={dateLong}
        timeStr={timeStr}
        onBack={() => navigate('/blitz')}
        onBeginSetup={async () => {
          if (!id) return;
          const { error } = await beginSetup(id);
          if (error) {
            toast({ title: 'Cannot start setup', description: error, variant: 'destructive' });
            return;
          }
          toast({ title: 'Setup started' });
          refetch();
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
  tournament: { id: string; name: string; scheduled_at: string | null; location: string | null; created_by: string | null; };
  isCreator: boolean;
  dateLong: string | null;
  timeStr: string | null;
  onBack: () => void;
  onBeginSetup: () => Promise<void>;
  onUpdate: (patch: { name?: string; scheduledAt?: string | null; location?: string | null }) => Promise<{ error: string | null }>;
  onDelete: () => void;
  deleteOpen: boolean;
  onDeleteClose: () => void;
  deleteCode: string;
  setDeleteCode: (s: string) => void;
  deleting: boolean;
  onConfirmDelete: () => void;
}

function AnnouncedView(props: AnnouncedViewProps) {
  const {
    tournament, isCreator, dateLong, timeStr,
    onBack, onBeginSetup, onUpdate, onDelete,
    deleteOpen, onDeleteClose, deleteCode, setDeleteCode, deleting, onConfirmDelete,
  } = props;

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

          {/* Date / time block */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${colors.accent}`,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: colors.accent,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: spacing.sm,
            }}>
              When
            </div>
            {editing ? (
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
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>
                  {dateLong || 'Date to be confirmed'}
                </div>
                {timeStr && (
                  <div style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                    at {timeStr}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Location block */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${colors.accent}`,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: colors.accent,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: spacing.sm,
            }}>
              Where
            </div>
            {editing ? (
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
            ) : (
              <div style={{
                fontSize: 18, fontWeight: 700,
                color: tournament.location ? colors.text : colors.muted,
              }}>
                {tournament.location || 'Location to be confirmed'}
              </div>
            )}
          </div>

          {/* Host actions */}
          {isCreator ? (
            editing ? (
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <button
                  onClick={() => { setEditing(false);
                    setDraftName(tournament.name);
                    setDraftLocation(tournament.location ?? '');
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
                <button
                  onClick={async () => { setStarting(true); await onBeginSetup(); setStarting(false); }}
                  disabled={starting}
                  style={{
                    width: '100%', padding: `${spacing.md + 2}px`,
                    background: colors.primary, color: '#000',
                    border: 'none', borderRadius: radius.sm,
                    fontSize: 16, fontWeight: 800, fontFamily: fonts.sans,
                    cursor: 'pointer', opacity: starting ? 0.6 : 1,
                    marginBottom: spacing.sm,
                  }}
                >
                  {starting ? 'Starting...' : 'Start setup →'}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    width: '100%', padding: `${spacing.sm + 2}px`,
                    background: 'transparent', color: colors.textSecondary,
                    border: `1px solid ${colors.border}`, borderRadius: radius.sm,
                    fontSize: 13, fontWeight: 600, fontFamily: fonts.sans,
                    cursor: 'pointer',
                  }}
                >
                  Edit details
                </button>
              </>
            )
          ) : (
            <div style={{
              textAlign: 'center', padding: `${spacing.lg}px`,
              background: colors.surface, borderRadius: radius.md,
              border: `1px dashed ${colors.border}`,
            }}>
              <span style={{ fontSize: 13, color: colors.muted }}>
                Waiting for the host to set up the players
              </span>
            </div>
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
