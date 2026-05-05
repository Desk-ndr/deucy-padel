import React, { useState } from 'react';
import { BlitzPlayer, BlitzRound, BlitzBet } from '@/services/blitzService';
import { BlitzRoundSchedule, EUROS_PER_GAME } from '@/lib/blitz-schedule';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

interface Props {
  players: (BlitzPlayer & { index: number })[];
  rounds: BlitzRound[];
  bets: BlitzBet[];
  schedule: BlitzRoundSchedule[];
}

export default function BlitzLeaderboard({ players, rounds, bets, schedule }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const completedRounds = rounds.filter(r => r.status === 'completed');

  const getPlayerStats = (playerIndex: number) => {
    let gamesWon = 0;
    const ledger: { round: number; type: 'game' | 'bet'; label: string; amount: number; detail: string }[] = [];

    for (const r of completedRounds) {
      const s = schedule[r.round_index - 1];
      if (!s) continue;
      const onA = s.teamA.includes(playerIndex);
      const onB = s.teamB.includes(playerIndex);
      if (onA && r.team_a_score != null) {
        gamesWon += r.team_a_score;
        const earned = r.team_a_score * EUROS_PER_GAME;
        if (earned > 0) ledger.push({ round: r.round_index, type: 'game', label: 'Games won', amount: earned, detail: `${r.team_a_score} games` });
      } else if (onB && r.team_b_score != null) {
        gamesWon += r.team_b_score;
        const earned = r.team_b_score * EUROS_PER_GAME;
        if (earned > 0) ledger.push({ round: r.round_index, type: 'game', label: 'Games won', amount: earned, detail: `${r.team_b_score} games` });
      }
    }

    const playerBets = bets.filter(b => b.bettor_index === playerIndex && b.status !== 'pending');
    for (const bet of playerBets) {
      if (bet.status === 'won') {
        ledger.push({ round: bet.round_index, type: 'bet', label: 'Bet won', amount: bet.stake, detail: `Team ${bet.predicted_winner}` });
      } else if (bet.status === 'lost') {
        ledger.push({ round: bet.round_index, type: 'bet', label: 'Bet lost', amount: -bet.stake, detail: `Team ${bet.predicted_winner}` });
      } else if (bet.status === 'draw') {
        ledger.push({ round: bet.round_index, type: 'bet', label: 'Bet refund', amount: 0, detail: 'Draw' });
      }
    }

    ledger.sort((a, b) => a.round - b.round);
    return { gamesWon, ledger };
  };

  const medalColors = [colors.gold, colors.silver, colors.bronze];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      {/* Podium — top 3 */}
      {players.length >= 3 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          gap: spacing.xl, paddingTop: spacing.lg,
        }}>
          {/* 2nd place */}
          <PodiumSlot player={players[1]} rank={1} color={medalColors[1]} />
          {/* 1st place (taller) */}
          <PodiumSlot player={players[0]} rank={0} color={medalColors[0]} tall />
          {/* 3rd place */}
          <PodiumSlot player={players[2]} rank={2} color={medalColors[2]} />
        </div>
      )}

      {/* Full table */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36px 1fr 48px 72px 24px',
          alignItems: 'center', gap: spacing.sm,
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ ...typeScale.micro, color: colors.muted }}>#</span>
          <span style={{ ...typeScale.micro, color: colors.muted }}>Player</span>
          <span style={{ ...typeScale.micro, color: colors.muted, textAlign: 'right' }}>W</span>
          <span style={{ ...typeScale.micro, color: colors.muted, textAlign: 'right' }}>Balance</span>
          <span />
        </div>

        {/* Player rows */}
        {players.map((p, rank) => {
          const { gamesWon, ledger } = getPlayerStats(p.index);
          const isExpanded_ = expanded === p.index;
          const isTopThree = rank < 3;

          return (
            <React.Fragment key={p.index}>
              <div
                onClick={() => setExpanded(isExpanded_ ? null : p.index)}
                style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr 48px 72px 24px',
                  alignItems: 'center', gap: spacing.sm,
                  padding: `${spacing.md}px`,
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  backgroundColor: rank === 0 ? colors.primaryMuted : 'transparent',
                  transition: 'background-color 0.15s',
                }}
              >
                {/* Rank */}
                {isTopThree ? (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: medalColors[rank],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900, color: colors.bg,
                  }}>
                    {rank + 1}
                  </div>
                ) : (
                  <span style={{ ...typeScale.body, color: colors.muted, fontWeight: 700 }}>
                    {rank + 1}
                  </span>
                )}

                {/* Name */}
                <span style={{ ...typeScale.body, color: colors.text, fontWeight: 600 }}>
                  {p.name}
                </span>

                {/* Games won */}
                <span style={{ ...typeScale.mono, fontSize: 14, color: colors.textSecondary, textAlign: 'right' }}>
                  {gamesWon}
                </span>

                {/* Balance */}
                <span style={{
                  fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                  color: colors.primary, textAlign: 'right',
                }}>
                  {'\u20AC'}{p.balance}
                </span>

                {/* Chevron */}
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: isExpanded_ ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Expanded ledger */}
              {isExpanded_ && (
                <div style={{
                  padding: `${spacing.sm}px ${spacing.lg}px ${spacing.md}px`,
                  backgroundColor: colors.bgSubtle,
                  borderBottom: `1px solid ${colors.border}`,
                }}>
                  <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.sm }}>
                    Transaction Ledger
                  </span>

                  {ledger.length === 0 ? (
                    <span style={{ ...typeScale.caption, color: colors.muted }}>No transactions yet</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                      {ledger.map((entry, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: spacing.sm,
                          padding: `${spacing.xs}px 0`,
                          borderBottom: i < ledger.length - 1 ? `1px solid ${colors.border}` : 'none',
                          fontSize: 14,
                        }}>
                          {/* Colored dot */}
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: entry.type === 'game' ? colors.primary : colors.accent,
                          }} />
                          <span style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: 14, minWidth: 24 }}>
                            R{entry.round}
                          </span>
                          <span style={{ flex: 1, color: colors.textSecondary, fontFamily: fonts.sans, fontWeight: 500 }}>
                            {entry.label}
                          </span>
                          <span style={{ color: colors.muted, fontSize: 14, marginRight: spacing.sm }}>
                            {entry.detail}
                          </span>
                          <span style={{
                            fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                            color: entry.amount > 0 ? colors.primary : entry.amount < 0 ? colors.destructive : colors.muted,
                          }}>
                            {entry.amount > 0 ? '+' : ''}{'\u20AC'}{entry.amount}
                          </span>
                        </div>
                      ))}

                      {/* Total */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        paddingTop: spacing.sm, borderTop: `1px solid ${colors.border}`, marginTop: spacing.xs,
                      }}>
                        <span style={{ ...typeScale.caption, color: colors.textSecondary }}>Total</span>
                        <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color: colors.primary }}>
                          {'\u20AC'}{p.balance}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ── Podium slot sub-component ────────────────────────────────── */

function PodiumSlot({ player, rank, color, tall }: {
  player: BlitzPlayer & { index: number };
  rank: number;
  color: string;
  tall?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: spacing.xs, marginBottom: tall ? 0 : spacing.lg,
    }}>
      {/* Circle avatar */}
      <div style={{
        width: tall ? 56 : 48, height: tall ? 56 : 48,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        backgroundColor: colors.surfaceElevated,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: tall ? 22 : 18, fontWeight: 900,
        color, fontFamily: fonts.sans,
        boxShadow: `0 0 20px ${color}40`,
      }}>
        {player.name.charAt(0).toUpperCase()}
      </div>
      {/* Name */}
      <span style={{
        ...typeScale.caption, color: colors.text,
        maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {player.name}
      </span>
      {/* Balance */}
      <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color }}>
        {'\u20AC'}{player.balance}
      </span>
    </div>
  );
}
