import { useState, useEffect, useRef } from 'react';
import { BlitzTournamentData, BlitzRound } from '@/services/blitzService';
import { colors, spacing, radius, fonts, typeScale, shadows } from '@/lib/design-tokens';
import { HeroCard } from '@/components/ui/deucy';
import BlitzTimer from './BlitzTimer';

interface Props {
  tournament: BlitzTournamentData;
  rounds: BlitzRound[];
  isCreator: boolean;
  playerIndex: number | null;
  timerProps: { secondsLeft: number; isRunning: boolean; isPaused: boolean; isExpired: boolean };
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onSubmitScore: (scoreA: number, scoreB: number) => Promise<void>;
  onEditScore: (roundId: string, roundIndex: number, scoreA: number, scoreB: number) => Promise<void>;
  onBetClick: () => void;
}

export default function BlitzMatchTab({
  tournament, rounds, isCreator, playerIndex, timerProps,
  onStartTimer, onPauseTimer, onResetTimer, onSubmitScore, onEditScore, onBetClick,
}: Props) {
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [editingRound, setEditingRound] = useState<BlitzRound | null>(null);
  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');

  // ── Timer expired feedback (audio beep + vibration) ─────────
  // Fires once on the false → true transition of isExpired. Reset
  // when the timer is restarted so a re-run will trigger again.
  const wasExpiredRef = useRef(false);
  useEffect(() => {
    if (timerProps.isExpired && !wasExpiredRef.current) {
      wasExpiredRef.current = true;

      // 3 short beeps — works without any external audio asset.
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
        if (Ctx) {
          const ctx = new Ctx();
          [0, 200, 400].forEach((delay) => {
            window.setTimeout(() => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.0001, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.2);
            }, delay);
          });
        }
      } catch {
        // Audio context blocked (autoplay policy, etc.) — silent fallback.
      }

      // Haptic feedback (mobile) — pattern: buzz / pause / buzz / pause / long.
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([200, 100, 200, 100, 400]); } catch {}
      }
    } else if (!timerProps.isExpired && wasExpiredRef.current) {
      wasExpiredRef.current = false;
    }
  }, [timerProps.isExpired]);

  const totalRounds = tournament.total_rounds;
  const sortedPlayers = tournament.players
    .map((p, i) => ({ ...p, index: i }))
    .sort((a, b) => b.balance - a.balance);
  const currentSchedule =
    tournament.current_round > 0 &&
    tournament.current_round <= totalRounds &&
    tournament.schedule.length > 0
      ? tournament.schedule[tournament.current_round - 1]
      : null;

/* ── Finished state ─────────────────────────────────────────── */
  if (tournament.status === 'finished') {
    // Calculate matches won (0.5 for draws) + games won per player
    const completedAll = rounds.filter(r => r.status === 'completed');
    const gamesMap = new Map<number, number>();
    const matchesWonMap = new Map<number, number>();
    tournament.players.forEach((_, i) => { gamesMap.set(i, 0); matchesWonMap.set(i, 0); });
    for (const r of completedAll) {
      const s = tournament.schedule[r.round_index - 1];
      if (!s || r.team_a_score == null || r.team_b_score == null) continue;
      s.teamA.forEach(idx => gamesMap.set(idx, (gamesMap.get(idx) || 0) + r.team_a_score!));
      s.teamB.forEach(idx => gamesMap.set(idx, (gamesMap.get(idx) || 0) + r.team_b_score!));
      const aWon = r.team_a_score > r.team_b_score ? 1 : r.team_a_score === r.team_b_score ? 0.5 : 0;
      const bWon = r.team_b_score > r.team_a_score ? 1 : r.team_b_score === r.team_a_score ? 0.5 : 0;
      s.teamA.forEach(idx => matchesWonMap.set(idx, (matchesWonMap.get(idx) || 0) + aWon));
      s.teamB.forEach(idx => matchesWonMap.set(idx, (matchesWonMap.get(idx) || 0) + bWon));
    }

    // Sort: matchesWon desc -> gamesWon tiebreaker -> shared placement
    const ranked = tournament.players
      .map((p, i) => ({ ...p, index: i, matches: matchesWonMap.get(i) || 0, games: gamesMap.get(i) || 0 }))
      .sort((a, b) => {
        if (b.matches !== a.matches) return b.matches - a.matches;
        return b.games - a.games;
      });

    // Assign shared placements
    const placements: number[] = [];
    ranked.forEach((p, sortPos) => {
      if (sortPos === 0) {
        placements.push(1);
      } else {
        const prev = ranked[sortPos - 1];
        if (p.matches === prev.matches && p.games === prev.games) {
          placements.push(placements[sortPos - 1]);
        } else {
          placements.push(sortPos + 1);
        }
      }
    });

    const winner = ranked[0];
    const POINTS: Record<number, number> = { 1: 50, 2: 35, 3: 22, 4: 12, 5: 5 };

    // Confetti particles
    const confettiColors = [colors.primary, colors.accent, colors.info, colors.gold, '#FF6B6B', '#C084FC'];
    const confettiParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 2,
      color: confettiColors[i % confettiColors.length],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
    }));

    return (
      <div style={{ padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.lg, position: 'relative', overflow: 'hidden' }}>
        {/* Confetti layer */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          {confettiParticles.map(p => (
            <div key={p.id} style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: -20,
              width: p.size,
              height: p.size * 1.5,
              backgroundColor: p.color,
              borderRadius: p.size > 7 ? '50%' : 2,
              transform: `rotate(${p.rotation}deg)`,
              animation: `confettiFall ${p.duration}s ${p.delay}s ease-in infinite`,
              opacity: 0.8,
            }} />
          ))}
        </div>

        {/* Trophy + Winner — celebration hero */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: spacing.lg, padding: `${spacing.xxl}px ${spacing.lg}px`,
          textAlign: 'center',
          background: `radial-gradient(ellipse at center, ${colors.primaryMuted} 0%, transparent 70%)`,
          borderRadius: radius.lg,
          border: `1px solid ${colors.border}`,
          animation: 'winnerGlow 3s ease-in-out infinite',
        }}>
          {/* Trophy with entrance animation */}
          <div style={{ animation: 'trophyEntrance 0.8s ease-out forwards' }}>
            <svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-.85-3.25-2.03-3.79A1.07 1.07 0 0 1 14 17v-2.34" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
            </svg>
          </div>

          {/* "Tournament Complete" label */}
          <span style={{
            ...typeScale.micro, color: colors.muted,
            animation: 'fadeSlideUp 0.6s 0.3s ease-out both',
          }}>
            Tournament Complete
          </span>

          {/* Winner name — big and bold */}
          <div style={{ animation: 'fadeSlideUp 0.6s 0.5s ease-out both' }}>
            <span style={{
              fontSize: 36, fontWeight: 900, fontFamily: fonts.sans,
              color: colors.primary, letterSpacing: '-0.02em',
              display: 'block',
            }}>
              {winner?.name}
            </span>
            <span style={{ ...typeScale.body, color: colors.textSecondary, marginTop: spacing.xs, display: 'block' }}>
              {winner.matches % 1 === 0 ? winner.matches : winner.matches.toFixed(1)} matches won  /  {winner.games} games
            </span>
          </div>

          {/* Points badge */}
          <div style={{
            animation: 'fadeSlideUp 0.6s 0.7s ease-out both',
            display: 'inline-flex', alignItems: 'center', gap: spacing.sm,
            padding: `${spacing.sm}px ${spacing.lg}px`,
            backgroundColor: 'rgba(34,197,94,0.12)',
            borderRadius: radius.pill,
            border: `1px solid rgba(34,197,94,0.25)`,
          }}>
            <span style={{ ...typeScale.mono, fontSize: 20, color: colors.primary }}>+{POINTS[1] || 0}</span>
            <span style={{ ...typeScale.caption, color: colors.textSecondary, textTransform: 'none' as const, letterSpacing: 0 }}>ranking pts</span>
          </div>
        </div>

        {/* Ranking Points Summary */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: spacing.lg, backgroundColor: colors.surface,
          borderRadius: radius.md, border: `1px solid ${colors.border}`,
          animation: 'fadeSlideUp 0.6s 0.9s ease-out both',
        }}>
          <h3 style={{ ...typeScale.title, color: colors.text, margin: 0, marginBottom: spacing.md, textAlign: 'center' }}>
            Ranking Points Earned
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {ranked.map((p, sortPos) => {
              const placement = placements[sortPos];
              const pts = POINTS[placement] || 0;
              const medalColor = placement === 1 ? colors.gold : placement === 2 ? colors.silver : placement === 3 ? colors.bronze : undefined;
              return (
                <div key={p.index} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  backgroundColor: placement <= 3 ? `rgba(${placement === 1 ? '255,215,0' : placement === 2 ? '192,192,192' : '205,127,50'},0.06)` : 'transparent',
                  borderRadius: radius.sm,
                  animation: `fadeSlideUp 0.4s ${1 + sortPos * 0.08}s ease-out both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <span style={{
                      ...typeScale.mono, fontSize: 14,
                      color: medalColor || colors.muted,
                      minWidth: 28, fontWeight: medalColor ? 900 : 800,
                    }}>
                      #{placement}
                    </span>
                    <span style={{ ...typeScale.body, color: colors.text, fontWeight: placement <= 3 ? 700 : 500 }}>
                      {p.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <span style={{ ...typeScale.mono, fontSize: 14, color: colors.muted }}>
                      {p.matches % 1 === 0 ? p.matches : p.matches.toFixed(1)}W {p.games}g
                    </span>
                    <span style={{
                      ...typeScale.mono, fontSize: 14, fontWeight: 700,
                      color: pts > 0 ? colors.primary : colors.muted,
                      minWidth: 32, textAlign: 'right',
                    }}>
                      +{pts}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Point scale legend */}
          <div style={{
            marginTop: spacing.md, paddingTop: spacing.md,
            borderTop: `1px solid ${colors.border}`,
            display: 'flex', justifyContent: 'center', gap: spacing.md, flexWrap: 'wrap',
          }}>
            <span style={{ ...typeScale.micro, color: colors.muted, fontSize: 14 }}>
              Placement: 50 / 35 / 22 / 12 / 5
            </span>
            <span style={{ ...typeScale.micro, color: colors.accent, fontSize: 14 }}>
              Betting bonus: +8 / +5 / +3 / +1 / 0
            </span>
          </div>
        </div>

        {/* Completed rounds with edit */}
        {isCreator && completedAll.length > 0 && (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <CompletedRounds
              rounds={completedAll} tournament={tournament} isCreator={isCreator}
              editingRound={editingRound} editScoreA={editScoreA} editScoreB={editScoreB}
              setEditingRound={setEditingRound} setEditScoreA={setEditScoreA} setEditScoreB={setEditScoreB}
              onEditScore={onEditScore}
            />
          </div>
        )}
      </div>
    );
  }

  if (!currentSchedule) return null;

  // ── Player context for this round ───────────────────────────
  const amResting = playerIndex !== null && currentSchedule.rest.includes(playerIndex);

  // Next-round preview (only relevant if I'm resting now and there is a next round).
  const nextSchedule = tournament.current_round < tournament.total_rounds
    ? tournament.schedule[tournament.current_round] // 0-based index of NEXT round
    : null;
  let nextInfo: { partnerName: string; opp1: string; opp2: string } | null = null;
  let nextRestAgain = false;
  if (amResting && nextSchedule && playerIndex !== null) {
    const onA = nextSchedule.teamA.includes(playerIndex);
    const onB = nextSchedule.teamB.includes(playerIndex);
    if (onA || onB) {
      const myTeam = onA ? nextSchedule.teamA : nextSchedule.teamB;
      const oppTeam = onA ? nextSchedule.teamB : nextSchedule.teamA;
      const partnerIdx = myTeam.find(i => i !== playerIndex);
      nextInfo = {
        partnerName: partnerIdx !== undefined ? (tournament.players[partnerIdx]?.name ?? '?') : '?',
        opp1: tournament.players[oppTeam[0]]?.name ?? '?',
        opp2: tournament.players[oppTeam[1]]?.name ?? '?',
      };
    } else {
      nextRestAgain = true;
    }
  }

  const handleSubmit = async () => {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return;
    await onSubmitScore(a, b);
    setScoreA(''); setScoreB(''); setShowScoreInput(false);
  };

  const completedRounds = rounds.filter(r => r.status === 'completed');

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 24, fontWeight: 800,
    textAlign: 'center',
    fontFamily: fonts.mono,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Round counter */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.xs }}>
          Round
        </span>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: spacing.xs }}>
          <span style={{
            fontSize: 36, fontWeight: 900, fontFamily: fonts.mono,
            color: colors.primary, letterSpacing: '-0.03em',
          }}>
            {tournament.current_round}
          </span>
          <span style={{ ...typeScale.body, color: colors.muted }}>/ {totalRounds}</span>
        </div>
      </div>

      {/* Teams card */}
      <HeroCard glow="primary">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center', gap: spacing.md, padding: spacing.sm,
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.sm }}>Team A</span>
            <p style={{ ...typeScale.title, color: colors.text, margin: 0 }}>{tournament.players[currentSchedule.teamA[0]]?.name}</p>
            <p style={{ ...typeScale.title, color: colors.text, margin: 0, marginTop: spacing.xs }}>{tournament.players[currentSchedule.teamA[1]]?.name}</p>
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, color: colors.muted }}>VS</span>
          <div style={{ textAlign: 'center' }}>
            <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.sm }}>Team B</span>
            <p style={{ ...typeScale.title, color: colors.text, margin: 0 }}>{tournament.players[currentSchedule.teamB[0]]?.name}</p>
            <p style={{ ...typeScale.title, color: colors.text, margin: 0, marginTop: spacing.xs }}>{tournament.players[currentSchedule.teamB[1]]?.name}</p>
          </div>
        </div>
      </HeroCard>

      {/* Resting — big card if it's me, small text for everyone else */}
      {amResting ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: spacing.md,
          padding: `${spacing.lg}px ${spacing.lg}px`,
          background: colors.infoMuted,
          border: `1px solid ${colors.info}`,
          borderRadius: radius.md,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(56,189,248,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.info}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4v16" /><path d="M22 4v16" />
              <path d="M2 8h20" /><path d="M2 16h20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              ...typeScale.title, color: colors.text, margin: 0, marginBottom: 2,
            }}>
              You're resting
            </p>
            <p style={{
              ...typeScale.caption, color: colors.textSecondary, margin: 0,
            }}>
              Round {tournament.current_round} — bet on the match below
            </p>
          </div>
        </div>
      ) : currentSchedule.rest.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.sm }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.info} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span style={{ ...typeScale.caption, color: colors.info }}>
            Resting: {currentSchedule.rest.map(i => tournament.players[i]?.name).join(', ')}
          </span>
        </div>
      ) : null}

      {/* Timer */}
      <BlitzTimer
        secondsLeft={timerProps.secondsLeft} isRunning={timerProps.isRunning}
        isPaused={timerProps.isPaused} isExpired={timerProps.isExpired}
        durationSeconds={tournament.round_duration_seconds}
        onStart={onStartTimer} onPause={onPauseTimer} onReset={onResetTimer}
      />

      {/* Submit score trigger */}
      {isCreator && !showScoreInput && (
        <button onClick={() => setShowScoreInput(true)} style={{
          width: '100%', padding: spacing.md,
          backgroundColor: colors.primary, color: colors.bg,
          border: 'none', borderRadius: radius.sm,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: fonts.sans,
        }}>
          Submit Score & {tournament.current_round >= totalRounds ? 'Finish' : 'Next Round'} →
        </button>
      )}

      {/* Score input card */}
      {isCreator && showScoreInput && (
        <div style={{
          padding: spacing.lg, backgroundColor: colors.surface,
          borderRadius: radius.md, border: `1px solid ${colors.border}`,
          display: 'flex', flexDirection: 'column', gap: spacing.md,
        }}>
          <p style={{ ...typeScale.title, color: colors.text, textAlign: 'center', margin: 0 }}>Enter Final Score</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'flex-end', gap: spacing.md }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              <label style={{ ...typeScale.micro, color: colors.muted, textAlign: 'center' }}>Team A</label>
              <input type="number" min="0" placeholder="0" value={scoreA} onChange={e => setScoreA(e.target.value)} style={inputStyle} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.muted, paddingBottom: spacing.md }}>—</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              <label style={{ ...typeScale.micro, color: colors.muted, textAlign: 'center' }}>Team B</label>
              <input type="number" min="0" placeholder="0" value={scoreB} onChange={e => setScoreB(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button onClick={() => setShowScoreInput(false)} style={{
              flex: 1, padding: spacing.md, backgroundColor: colors.surfaceElevated, color: colors.textSecondary,
              border: `1px solid ${colors.border}`, borderRadius: radius.sm,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.sans,
            }}>Cancel</button>
            <button onClick={handleSubmit} disabled={!scoreA || !scoreB} style={{
              flex: 1, padding: spacing.md, backgroundColor: colors.primary, color: colors.bg,
              border: 'none', borderRadius: radius.sm, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: fonts.sans, opacity: scoreA && scoreB ? 1 : 0.4,
            }}>Confirm →</button>
          </div>
        </div>
      )}

      {/* Completed rounds */}
      {completedRounds.length > 0 && (
        <CompletedRounds
          rounds={completedRounds} tournament={tournament} isCreator={isCreator}
          editingRound={editingRound} editScoreA={editScoreA} editScoreB={editScoreB}
          setEditingRound={setEditingRound} setEditScoreA={setEditScoreA} setEditScoreB={setEditScoreB}
          onEditScore={onEditScore}
        />
      )}

      {/* ── Sticky next-round banner — shown only to resting players ── */}
      {amResting && (nextInfo || nextRestAgain) && (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            left: 0, right: 0,
            bottom: `calc(72px + env(safe-area-inset-bottom, 0px))`,
            maxWidth: 430,
            margin: '0 auto',
            padding: `${spacing.sm}px ${spacing.lg}px`,
            background: colors.surface,
            borderTop: `1px solid ${colors.border}`,
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            zIndex: 40,
            boxShadow: `0 -4px 12px rgba(0,0,0,0.4)`,
          }}
        >
          <span style={{
            ...typeScale.micro, color: colors.muted, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            flexShrink: 0,
          }}>
            Next R{tournament.current_round + 1}
          </span>
          {nextInfo ? (
            <span style={{
              ...typeScale.caption, color: colors.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1,
            }}>
              with <strong style={{ color: colors.primary }}>{nextInfo.partnerName}</strong>
              {' '}vs {nextInfo.opp1}, {nextInfo.opp2}
            </span>
          ) : (
            <span style={{
              ...typeScale.caption, color: colors.textSecondary,
              flex: 1,
            }}>
              You rest again
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Completed Rounds sub-component with inline edit ──────────── */

function CompletedRounds({ rounds, tournament, isCreator, editingRound, editScoreA, editScoreB, setEditingRound, setEditScoreA, setEditScoreB, onEditScore }: {
  rounds: BlitzRound[];
  tournament: BlitzTournamentData;
  isCreator: boolean;
  editingRound: BlitzRound | null;
  editScoreA: string;
  editScoreB: string;
  setEditingRound: (r: BlitzRound | null) => void;
  setEditScoreA: (v: string) => void;
  setEditScoreB: (v: string) => void;
  onEditScore: (roundId: string, roundIndex: number, scoreA: number, scoreB: number) => Promise<void>;
}) {
  const handleEditConfirm = async () => {
    if (!editingRound) return;
    const a = parseInt(editScoreA);
    const b = parseInt(editScoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return;
    await onEditScore(editingRound.id, editingRound.round_index, a, b);
    setEditingRound(null); setEditScoreA(''); setEditScoreB('');
  };

  const editInputStyle: React.CSSProperties = {
    width: 40, padding: `${spacing.xs}px`, backgroundColor: colors.bg,
    border: `1px solid ${colors.primary}`, borderRadius: radius.sm,
    color: colors.text, fontSize: 16, fontWeight: 800,
    textAlign: 'center', fontFamily: fonts.mono, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      <span style={{ ...typeScale.micro, color: colors.muted }}>Completed Rounds</span>
      {rounds.map(r => {
        const s = tournament.schedule[r.round_index - 1];
        if (!s) return null;
        const isEditing = editingRound?.id === r.id;

        return (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: spacing.sm,
            padding: `${spacing.sm}px ${spacing.md}px`,
            backgroundColor: isEditing ? colors.surface : colors.surfaceElevated,
            borderRadius: radius.sm, fontSize: 14,
            border: isEditing ? `1px solid ${colors.primary}` : '1px solid transparent',
            transition: 'all 0.15s',
          }}>
            <span style={{ ...typeScale.mono, fontSize: 14, color: colors.muted, minWidth: 28 }}>
              R{r.round_index}
            </span>
            <span style={{
              flex: 1, color: colors.textSecondary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: fonts.sans, fontWeight: 500,
            }}>
              {tournament.players[s.teamA[0]]?.name} & {tournament.players[s.teamA[1]]?.name}
            </span>

            {isEditing ? (
              <>
                <input type="number" min="0" value={editScoreA} onChange={e => setEditScoreA(e.target.value)} style={editInputStyle} />
                <span style={{ color: colors.muted, fontWeight: 700 }}>-</span>
                <input type="number" min="0" value={editScoreB} onChange={e => setEditScoreB(e.target.value)} style={editInputStyle} />
                <button onClick={handleEditConfirm} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: spacing.xs,
                  color: colors.primary, display: 'flex',
                }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button onClick={() => setEditingRound(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: spacing.xs,
                  color: colors.destructive, display: 'flex',
                }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <span style={{
                  fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                  color: colors.primary, minWidth: 44, textAlign: 'center',
                }}>
                  {r.team_a_score} - {r.team_b_score}
                </span>
                <span style={{
                  flex: 1, color: colors.textSecondary, textAlign: 'right',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: fonts.sans, fontWeight: 500,
                }}>
                  {tournament.players[s.teamB[0]]?.name} & {tournament.players[s.teamB[1]]?.name}
                </span>
                {isCreator && (
                  <button onClick={() => {
                    setEditingRound(r);
                    setEditScoreA(String(r.team_a_score ?? 0));
                    setEditScoreB(String(r.team_b_score ?? 0));
                  }} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: spacing.xs,
                    color: colors.muted, display: 'flex', flexShrink: 0,
                  }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
