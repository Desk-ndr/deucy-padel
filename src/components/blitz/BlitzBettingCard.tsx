import { useState, useEffect, useRef } from 'react';
import { BlitzTournamentData, BlitzBet } from '@/services/blitzService';
import { BlitzRoundSchedule } from '@/lib/blitz-schedule';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

// ── Constants ──

const STAKE_PRESETS = [1, 3, 5];
const CANCEL_WINDOW_MS = 60_000;

// ── Types ──

interface BlitzBettingCardProps {
  tournament: BlitzTournamentData;
  currentSchedule: BlitzRoundSchedule;
  playerIndex: number;
  playerBalance: number;
  existingBet: BlitzBet | null;
  bets: BlitzBet[];
  onPlaceBet: (prediction: 'A' | 'B', stake: number) => Promise<void>;
  onCancelBet?: (betId: string, refundStake: number) => Promise<void>;
}

// ── Main Component ──

export default function BlitzBettingCard({
  tournament, currentSchedule, playerIndex, playerBalance,
  existingBet, bets,
  onPlaceBet, onCancelBet,
}: BlitzBettingCardProps) {
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | null>(null);
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [confirmingAllIn, setConfirmingAllIn] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Only render for resting players
  if (!currentSchedule.rest.includes(playerIndex)) return null;

  /* ─────────────────── Already-bet view with Undo ─────────────────── */

  if (existingBet) {
    return (
      <ExistingBetCard
        bet={existingBet}
        cancelling={cancelling}
        onCancel={onCancelBet ? async () => {
          setCancelling(true);
          try {
            await onCancelBet(existingBet.id, existingBet.stake);
          } finally {
            setCancelling(false);
          }
        } : undefined}
      />
    );
  }

  /* ─────────────────── Active betting view ─────────────────── */

  const isAllIn = selectedStake !== null && selectedStake === playerBalance && playerBalance > 0;
  const canConfirm = selectedTeam !== null && selectedStake !== null && selectedStake > 0 && selectedStake <= playerBalance && !placing;

  const handleConfirmClick = () => {
    if (!canConfirm) return;
    if (isAllIn && !confirmingAllIn) {
      // First click on an all-in confirm asks for explicit confirmation
      setConfirmingAllIn(true);
      return;
    }
    actuallyConfirm();
  };

  const actuallyConfirm = async () => {
    if (!selectedTeam || !selectedStake) return;
    setPlacing(true);
    try {
      await onPlaceBet(selectedTeam, selectedStake);
    } finally {
      setPlacing(false);
      setConfirmingAllIn(false);
    }
  };

  const cancelAllInConfirm = () => setConfirmingAllIn(false);

  const pickPreset = (stake: number) => {
    setSelectedStake(stake);
    setCustomMode(false);
    setCustomValue('');
    setConfirmingAllIn(false);
  };

  const pickAllIn = () => {
    setSelectedStake(playerBalance);
    setCustomMode(false);
    setCustomValue('');
    setConfirmingAllIn(false);
  };

  const enterCustomMode = () => {
    setCustomMode(true);
    setSelectedStake(null);
    setCustomValue('');
    setConfirmingAllIn(false);
  };

  const onCustomChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    setCustomValue(cleaned);
    const n = parseInt(cleaned, 10);
    if (!isNaN(n) && n > 0 && n <= playerBalance) {
      setSelectedStake(n);
    } else {
      setSelectedStake(null);
    }
    setConfirmingAllIn(false);
  };

  // Sentiment from current round bets
  const roundBets = bets.filter(b => b.round_index === tournament.current_round && b.status === 'pending');
  const teamABets = roundBets.filter(b => b.predicted_winner === 'A').length;
  const teamBBets = roundBets.filter(b => b.predicted_winner === 'B').length;

  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: spacing.lg,
      display: 'flex', flexDirection: 'column', gap: spacing.lg,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ ...typeScale.title, color: colors.text, margin: 0 }}>
          Prediction Card
        </h3>
        <p style={{ ...typeScale.caption, color: colors.muted, margin: `${spacing.xs}px 0 0` }}>
          You are resting this round. Place your prediction.
        </p>
      </div>

      {/* Team selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
        <TeamCard
          label="Team A"
          players={currentSchedule.teamA.map(i => tournament.players[i]?.name || '?')}
          color={colors.primary}
          glowColor={colors.primaryGlow}
          selected={selectedTeam === 'A'}
          onClick={() => { setSelectedTeam('A'); setConfirmingAllIn(false); }}
        />
        <TeamCard
          label="Team B"
          players={currentSchedule.teamB.map(i => tournament.players[i]?.name || '?')}
          color={colors.accent}
          glowColor={`${colors.accent}30`}
          selected={selectedTeam === 'B'}
          onClick={() => { setSelectedTeam('B'); setConfirmingAllIn(false); }}
        />
      </div>

      {/* Sentiment bar */}
      {(teamABets > 0 || teamBBets > 0) && (
        <SentimentBar teamACount={teamABets} teamBCount={teamBBets} />
      )}

      {/* Stake selection */}
      {selectedTeam && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <span style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center' }}>
            Choose your stake
          </span>
          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
            {STAKE_PRESETS.filter(s => s <= playerBalance).map(stake => (
              <StakePill
                key={stake}
                label={`€${stake}`}
                active={!customMode && selectedStake === stake}
                onClick={() => pickPreset(stake)}
              />
            ))}

            {playerBalance > 1 && (
              <StakePill
                label="Other"
                active={customMode}
                accent={colors.info}
                onClick={enterCustomMode}
              />
            )}

            {playerBalance > 0 && (
              <StakePill
                label="All-in"
                active={!customMode && isAllIn}
                accent={colors.destructive}
                onClick={pickAllIn}
              />
            )}
          </div>

          {/* Custom input */}
          {customMode && (
            <div style={{ marginTop: spacing.xs }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={`1 – ${playerBalance}`}
                value={customValue}
                onChange={e => onCustomChange(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  background: colors.bg,
                  border: `1px solid ${selectedStake !== null ? colors.info : colors.border}`,
                  borderRadius: radius.sm,
                  color: colors.text,
                  fontFamily: fonts.mono,
                  fontSize: 16, fontWeight: 700,
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {customValue && selectedStake === null && (
                <p style={{
                  ...typeScale.caption, color: colors.destructive,
                  margin: `${spacing.xs}px 0 0`, textAlign: 'center',
                }}>
                  Enter a value between 1 and €{playerBalance}.
                </p>
              )}
            </div>
          )}

          <span style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center' }}>
            Balance: €{playerBalance}
          </span>
        </div>
      )}

      {/* All-in confirmation gate */}
      {selectedTeam && selectedStake && confirmingAllIn && (
        <div style={{
          padding: spacing.md,
          background: 'rgba(239,68,68,0.08)',
          border: `1px solid ${colors.destructive}`,
          borderRadius: radius.sm,
          display: 'flex', flexDirection: 'column', gap: spacing.sm,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.destructive}
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{
              ...typeScale.caption, color: colors.text, fontWeight: 700,
            }}>
              All-in: €{selectedStake} on Team {selectedTeam}
            </span>
          </div>
          <p style={{
            ...typeScale.caption, color: colors.textSecondary, margin: 0,
          }}>
            If you lose, your balance drops to €0.
          </p>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button
              onClick={cancelAllInConfirm}
              disabled={placing}
              style={{
                flex: 1, padding: spacing.sm,
                background: colors.surfaceElevated, color: colors.textSecondary,
                border: `1px solid ${colors.border}`, borderRadius: radius.sm,
                fontFamily: fonts.sans, fontWeight: 600, fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={actuallyConfirm}
              disabled={placing}
              style={{
                flex: 1, padding: spacing.sm,
                background: colors.destructive, color: '#fff',
                border: 'none', borderRadius: radius.sm,
                fontFamily: fonts.sans, fontWeight: 700, fontSize: 14,
                cursor: 'pointer', opacity: placing ? 0.6 : 1,
              }}
            >
              {placing ? 'Placing...' : 'Yes, all-in'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm button + payout preview (hidden during all-in confirmation) */}
      {selectedTeam && selectedStake && !confirmingAllIn && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <button
            onClick={handleConfirmClick}
            disabled={!canConfirm}
            style={{
              width: '100%', padding: spacing.md,
              backgroundColor: canConfirm ? colors.primary : colors.surfaceElevated,
              color: canConfirm ? colors.bg : colors.muted,
              border: 'none', borderRadius: radius.sm,
              fontFamily: fonts.sans, fontWeight: 700, fontSize: 14,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
              opacity: placing ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {placing
              ? 'Placing...'
              : `Confirm: €${selectedStake} on Team ${selectedTeam}`}
          </button>

          {/* Payout preview */}
          <div style={{
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            padding: `${spacing.xs}px ${spacing.sm}px`,
            background: colors.bgSubtle,
            borderRadius: radius.sm,
            fontSize: 13,
          }}>
            <PayoutCell label="Win" value={`+€${selectedStake}`} color={colors.primary} />
            <Divider />
            <PayoutCell label="Draw" value="refund" color={colors.textSecondary} />
            <Divider />
            <PayoutCell label="Loss" value={`−€${selectedStake}`} color={colors.destructive} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Existing-bet card with Undo countdown ──────────────────────── */

function ExistingBetCard({ bet, cancelling, onCancel }: {
  bet: BlitzBet;
  cancelling: boolean;
  onCancel?: () => Promise<void>;
}) {
  // Compute remaining cancel window from bet.created_at.
  const createdAt = bet.created_at ? new Date(bet.created_at).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (createdAt === null || !onCancel) return;
    const tick = () => setNow(Date.now());
    intervalRef.current = setInterval(tick, 250);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [createdAt, onCancel]);

  const elapsed = createdAt !== null ? now - createdAt : Infinity;
  const remainingMs = Math.max(0, CANCEL_WINDOW_MS - elapsed);
  const canCancel = !!onCancel && createdAt !== null && remainingMs > 0;
  const remainingSec = Math.ceil(remainingMs / 1000);

  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: spacing.lg,
      display: 'flex', flexDirection: 'column', gap: spacing.md,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.primary}
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span style={{ ...typeScale.title, color: colors.text }}>Prediction Placed</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: spacing.md,
        backgroundColor: colors.bg,
        borderRadius: radius.sm,
        border: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          <span style={{ ...typeScale.caption, color: colors.muted }}>Your pick</span>
          <span style={{
            fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
            color: bet.predicted_winner === 'A' ? colors.primary : colors.accent,
          }}>
            Team {bet.predicted_winner}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: spacing.xs }}>
          <span style={{ ...typeScale.caption, color: colors.muted }}>Stake</span>
          <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: colors.text }}>
            €{bet.stake}
          </span>
        </div>
      </div>

      {/* Undo button (only inside the cancel window) */}
      {canCancel && onCancel && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          style={{
            width: '100%', padding: spacing.sm,
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            color: colors.textSecondary,
            fontFamily: fonts.sans, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
            opacity: cancelling ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: spacing.xs,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          {cancelling ? 'Cancelling...' : `Undo (${remainingSec}s left)`}
        </button>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, padding: spacing.sm,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          backgroundColor: colors.primary,
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <span style={{ ...typeScale.caption, color: colors.muted }}>
          Waiting for result
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}

/* ── Stake pill ──────────────────────────────────────────────── */

function StakePill({ label, active, accent, onClick }: {
  label: string;
  active: boolean;
  accent?: string;
  onClick: () => void;
}) {
  const bg = active ? (accent ?? colors.primary) : colors.bg;
  const fg = active ? (accent === colors.destructive ? '#fff' : (accent === colors.info ? '#000' : colors.bg)) : colors.text;
  const border = active ? (accent ?? colors.primary) : colors.border;
  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 64px', maxWidth: 96,
        padding: `${spacing.sm}px ${spacing.md}px`,
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: radius.sm,
        fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

/* ── Payout preview cells ───────────────────────────────────── */

function PayoutCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      flex: 1, minWidth: 0,
    }}>
      <span style={{
        ...typeScale.micro, color: colors.muted, fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: fonts.mono, fontSize: 13, fontWeight: 700,
        color,
      }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <span style={{
      width: 1, height: 22,
      background: colors.border,
      flexShrink: 0,
    }} />
  );
}

/* ── Sub-components (unchanged from previous version) ──────────── */

function TeamCard({ label, players, color, glowColor, selected, onClick }: {
  label: string;
  players: string[];
  color: string;
  glowColor: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: spacing.sm, padding: spacing.md,
        backgroundColor: selected ? `${color}15` : colors.bg,
        border: `2px solid ${selected ? color : colors.border}`,
        borderRadius: radius.md,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: selected ? `0 0 20px ${glowColor}` : 'none',
        position: 'relative' as const,
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute' as const, top: 8, right: 8,
          width: 20, height: 20, borderRadius: '50%',
          backgroundColor: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.bg}
            strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      <span style={{
        ...typeScale.caption, fontWeight: 800, color: selected ? color : colors.muted,
        textTransform: 'uppercase' as const, letterSpacing: '0.05em',
      }}>
        {label}
      </span>
      {players.map((name, i) => (
        <span key={i} style={{
          ...typeScale.body, color: colors.text, fontWeight: 600,
        }}>
          {name}
        </span>
      ))}
    </button>
  );
}

function SentimentBar({ teamACount, teamBCount }: { teamACount: number; teamBCount: number }) {
  const total = teamACount + teamBCount;
  const aPct = total > 0 ? (teamACount / total) * 100 : 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ ...typeScale.caption, color: colors.primary, fontWeight: 700 }}>
          A: {teamACount}
        </span>
        <span style={{ ...typeScale.caption, color: colors.muted }}>
          Predictions
        </span>
        <span style={{ ...typeScale.caption, color: colors.accent, fontWeight: 700 }}>
          B: {teamBCount}
        </span>
      </div>
      <div style={{
        height: 6, borderRadius: 3, overflow: 'hidden',
        backgroundColor: colors.border, display: 'flex',
      }}>
        <div style={{
          width: `${aPct}%`, height: '100%',
          backgroundColor: colors.primary,
          borderRadius: '3px 0 0 3px',
          transition: 'width 0.4s ease',
        }} />
        <div style={{
          width: `${100 - aPct}%`, height: '100%',
          backgroundColor: colors.accent,
          borderRadius: '0 3px 3px 0',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}
