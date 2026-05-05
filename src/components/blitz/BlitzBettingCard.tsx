import { useState } from 'react';
import { BlitzTournamentData, BlitzBet } from '@/services/blitzService';
import { BlitzRoundSchedule } from '@/lib/blitz-schedule';
import { colors, spacing, radius, fonts, typeScale, shadows } from '@/lib/design-tokens';
import { HeroCard } from '@/components/ui/deucy';

// ── Types ──

interface BlitzBettingCardProps {
  tournament: BlitzTournamentData;
  currentSchedule: BlitzRoundSchedule;
  playerIndex: number;
  playerBalance: number;
  existingBet: BlitzBet | null;
  bets: BlitzBet[];
  onPlaceBet: (prediction: 'A' | 'B', stake: number) => Promise<void>;
}

const STAKE_PRESETS = [1, 3, 5];

// ── Main Component ──

export default function BlitzBettingCard({
  tournament, currentSchedule, playerIndex, playerBalance,
  existingBet, bets, onPlaceBet,
}: BlitzBettingCardProps) {
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | null>(null);
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);

  // Only render for resting players
  if (!currentSchedule.rest.includes(playerIndex)) return null;

  // Already placed a bet this round
  if (existingBet) {
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
              color: existingBet.predicted_winner === 'A' ? colors.primary : colors.accent,
            }}>
              Team {existingBet.predicted_winner}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: spacing.xs }}>
            <span style={{ ...typeScale.caption, color: colors.muted }}>Stake</span>
            <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: colors.text }}>
              {'€'}{existingBet.stake}
            </span>
          </div>
        </div>

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

  // ── Active betting state ──

  const handleConfirm = async () => {
    if (!selectedTeam || !selectedStake) return;
    setPlacing(true);
    try {
      await onPlaceBet(selectedTeam, selectedStake);
    } finally {
      setPlacing(false);
    }
  };

  const isAllIn = selectedStake === playerBalance;
  const canConfirm = selectedTeam && selectedStake && selectedStake <= playerBalance && !placing;

  // Sentiment data from current round bets
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
          onClick={() => setSelectedTeam('A')}
        />
        <TeamCard
          label="Team B"
          players={currentSchedule.teamB.map(i => tournament.players[i]?.name || '?')}
          color={colors.accent}
          glowColor={`${colors.accent}30`}
          selected={selectedTeam === 'B'}
          onClick={() => setSelectedTeam('B')}
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
          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center' }}>
            {STAKE_PRESETS.filter(s => s <= playerBalance).map(stake => (
              <button
                key={stake}
                onClick={() => setSelectedStake(stake)}
                style={{
                  flex: 1, maxWidth: 80,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  backgroundColor: selectedStake === stake ? colors.primary : colors.bg,
                  color: selectedStake === stake ? colors.bg : colors.text,
                  border: `1px solid ${selectedStake === stake ? colors.primary : colors.border}`,
                  borderRadius: radius.sm,
                  fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {'€'}{stake}
              </button>
            ))}
            {playerBalance > 0 && (
              <button
                onClick={() => setSelectedStake(playerBalance)}
                style={{
                  flex: 1, maxWidth: 80,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  backgroundColor: isAllIn ? colors.destructive : colors.bg,
                  color: isAllIn ? '#fff' : colors.destructive,
                  border: `1px solid ${isAllIn ? colors.destructive : colors.border}`,
                  borderRadius: radius.sm,
                  fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                All-in
              </button>
            )}
          </div>
          <span style={{ ...typeScale.caption, color: colors.muted, textAlign: 'center' }}>
            Balance: {'€'}{playerBalance}
          </span>
        </div>
      )}

      {/* Confirm button */}
      {selectedTeam && selectedStake && (
        <button
          onClick={handleConfirm}
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
            : `Confirm: ${'€'}${selectedStake} on Team ${selectedTeam}`}
        </button>
      )}
    </div>
  );
}

// ── Sub-components ──

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
      {/* Checkmark */}
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
