import { useState } from 'react';
import { BlitzTournamentData, BlitzRound } from '@/services/blitzService';
import { EUROS_PER_GAME } from '@/lib/blitz-schedule';
import { colors, spacing, radius, fonts, typeScale, shadows } from '@/lib/design-tokens';
import { HeroCard } from '@/components/ui/deucy';
import BlitzTimer from './BlitzTimer';

interface Props {
  tournament: BlitzTournamentData;
  rounds: BlitzRound[];
  isCreator: boolean;
  timerProps: { secondsLeft: number; isRunning: boolean; isPaused: boolean; isExpired: boolean };
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onSubmitScore: (scoreA: number, scoreB: number) => Promise<void>;
  onBetClick: () => void;
}

export default function BlitzMatchTab({
  tournament, rounds, isCreator, timerProps,
  onStartTimer, onPauseTimer, onResetTimer, onSubmitScore, onBetClick,
}: Props) {
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [showScoreInput, setShowScoreInput] = useState(false);

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
    const winner = sortedPlayers[0];
    return (
      <div style={{ padding: spacing.lg }}>
        <HeroCard glow="primary">
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: spacing.md, padding: spacing.xl, textAlign: 'center',
          }}>
            {/* Trophy SVG */}
            <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-.85-3.25-2.03-3.79A1.07 1.07 0 0 1 14 17v-2.34" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
            </svg>

            <h2 style={{ ...typeScale.headline, color: colors.text, margin: 0 }}>
              Tournament Complete
            </h2>
            <span style={{ ...typeScale.caption, color: colors.muted }}>Winner</span>
            <span style={{
              fontSize: 28, fontWeight: 900, fontFamily: fonts.sans,
              color: colors.primary,
            }}>
              {winner?.name}
            </span>
            <span style={{ ...typeScale.mono, color: colors.textSecondary }}>
              {'\u20AC'}{winner?.balance}
            </span>
          </div>
        </HeroCard>
      </div>
    );
  }

  if (!currentSchedule) return null;

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
          {/* Team A */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.sm }}>
              Team A
            </span>
            <p style={{ ...typeScale.title, color: colors.text, margin: 0 }}>
              {tournament.players[currentSchedule.teamA[0]]?.name}
            </p>
            <p style={{ ...typeScale.title, color: colors.text, margin: 0, marginTop: spacing.xs }}>
              {tournament.players[currentSchedule.teamA[1]]?.name}
            </p>
          </div>

          {/* VS */}
          <span style={{ fontSize: 22, fontWeight: 900, color: colors.muted }}>VS</span>

          {/* Team B */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.sm }}>
              Team B
            </span>
            <p style={{ ...typeScale.title, color: colors.text, margin: 0 }}>
              {tournament.players[currentSchedule.teamB[0]]?.name}
            </p>
            <p style={{ ...typeScale.title, color: colors.text, margin: 0, marginTop: spacing.xs }}>
              {tournament.players[currentSchedule.teamB[1]]?.name}
            </p>
          </div>
        </div>
      </HeroCard>

      {/* Resting */}
      {currentSchedule.rest.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: spacing.sm, padding: spacing.sm,
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.info} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span style={{ ...typeScale.caption, color: colors.info }}>
            Resting: {currentSchedule.rest.map(i => tournament.players[i]?.name).join(', ')}
          </span>
        </div>
      )}

      {/* Timer */}
      <BlitzTimer
        secondsLeft={timerProps.secondsLeft}
        isRunning={timerProps.isRunning}
        isPaused={timerProps.isPaused}
        isExpired={timerProps.isExpired}
        durationSeconds={tournament.round_duration_seconds}
        onStart={onStartTimer}
        onPause={onPauseTimer}
        onReset={onResetTimer}
      />

      {/* Submit score trigger */}
      {isCreator && !showScoreInput && (
        <button
          onClick={() => setShowScoreInput(true)}
          style={{
            width: '100%', padding: spacing.md,
            backgroundColor: colors.primary, color: colors.bg,
            border: 'none', borderRadius: radius.sm,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: fonts.sans,
          }}
        >
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
          <p style={{ ...typeScale.title, color: colors.text, textAlign: 'center', margin: 0 }}>
            Enter Final Score
          </p>
          <p style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center', margin: 0 }}>
            Each game won = {'\u20AC'}{EUROS_PER_GAME} per player
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'flex-end', gap: spacing.md,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              <label style={{ ...typeScale.micro, color: colors.muted, textAlign: 'center' }}>Team A</label>
              <input type="number" min="0" placeholder="0" value={scoreA}
                onChange={e => setScoreA(e.target.value)} style={inputStyle} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.muted, paddingBottom: spacing.md }}>
              —
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              <label style={{ ...typeScale.micro, color: colors.muted, textAlign: 'center' }}>Team B</label>
              <input type="number" min="0" placeholder="0" value={scoreB}
                onChange={e => setScoreB(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {scoreA && scoreB && (
            <div style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center' }}>
              <p style={{ margin: 0 }}>
                Team A earns: <span style={{ fontWeight: 700, color: colors.primary }}>{'\u20AC'}{parseInt(scoreA) * EUROS_PER_GAME}</span>
              </p>
              <p style={{ margin: `${spacing.xs}px 0 0` }}>
                Team B earns: <span style={{ fontWeight: 700, color: colors.primary }}>{'\u20AC'}{parseInt(scoreB) * EUROS_PER_GAME}</span>
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button onClick={() => setShowScoreInput(false)} style={{
              flex: 1, padding: spacing.md,
              backgroundColor: colors.surfaceElevated, color: colors.textSecondary,
              border: `1px solid ${colors.border}`, borderRadius: radius.sm,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.sans,
            }}>Cancel</button>
            <button onClick={handleSubmit} disabled={!scoreA || !scoreB} style={{
              flex: 1, padding: spacing.md,
              backgroundColor: colors.primary, color: colors.bg,
              border: 'none', borderRadius: radius.sm,
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: fonts.sans,
              opacity: scoreA && scoreB ? 1 : 0.4,
            }}>Confirm →</button>
          </div>
        </div>
      )}

      {/* Completed rounds */}
      {completedRounds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <span style={{ ...typeScale.micro, color: colors.muted }}>Completed Rounds</span>
          {completedRounds.map(r => {
            const s = tournament.schedule[r.round_index - 1];
            if (!s) return null;
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                padding: `${spacing.sm}px ${spacing.md}px`,
                backgroundColor: colors.surfaceElevated, borderRadius: radius.sm,
                fontSize: 14,
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
