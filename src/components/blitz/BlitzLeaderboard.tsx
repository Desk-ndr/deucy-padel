import React, { useState } from 'react';
import { BlitzPlayer, BlitzRound, BlitzBet } from '@/services/blitzService';
import { BlitzRoundSchedule, EUROS_PER_GAME } from '@/lib/blitz-schedule';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

interface Props {
  crownPlayerName?: string | null;
  players: (BlitzPlayer & { index: number })[];
  rounds: BlitzRound[];
  bets: BlitzBet[];
  schedule: BlitzRoundSchedule[];
}

type Tab = 'games' | 'betting';

/* ── Color schemes per tab ─────────────────────────────────────── */
const tabTheme = {
  games: {
    accent: colors.primary,        // green
    accentMuted: colors.primaryMuted,
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-.85-3.25-2.03-3.79A1.07 1.07 0 0 1 14 17v-2.34" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
      </svg>
    ),
    label: 'Games',
    subtitle: 'Ranked by games won',
    valueLabel: 'W',
    totalLabel: 'pts_rank',
  },
  betting: {
    accent: colors.accent,         // amber
    accentMuted: colors.accentMuted,
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
    label: 'Betting',
    subtitle: 'Ranked by bet profit',
    valueLabel: '',
    totalLabel: 'Profit',
  },
};

export default function BlitzLeaderboard({ players, rounds, bets, schedule, crownPlayerName }: Props) {
  const [tab, setTab] = useState<Tab>('games');
  const [expanded, setExpanded] = useState<number | null>(null);
  const completedRounds = rounds.filter(r => r.status === 'completed');
  const theme = tabTheme[tab];

  const getPlayerStats = (playerIndex: number) => {
    let gamesWon = 0;
    let gameEarnings = 0;
    let betProfit = 0;
    const ledger: { round: number; type: 'game' | 'bet'; label: string; amount: number; detail: string }[] = [];

    for (const r of completedRounds) {
      const s = schedule[r.round_index - 1];
      if (!s) continue;
      const onA = s.teamA.includes(playerIndex);
      const onB = s.teamB.includes(playerIndex);
      if (onA && r.team_a_score != null) {
        gamesWon += r.team_a_score;
        const earned = r.team_a_score * EUROS_PER_GAME;
        gameEarnings += earned;
        if (earned > 0) ledger.push({ round: r.round_index, type: 'game', label: 'Games won', amount: earned, detail: `${r.team_a_score} games` });
      } else if (onB && r.team_b_score != null) {
        gamesWon += r.team_b_score;
        const earned = r.team_b_score * EUROS_PER_GAME;
        gameEarnings += earned;
        if (earned > 0) ledger.push({ round: r.round_index, type: 'game', label: 'Games won', amount: earned, detail: `${r.team_b_score} games` });
      }
    }

    const playerBets = bets.filter(b => b.bettor_index === playerIndex && b.status !== 'pending');
    for (const bet of playerBets) {
      if (bet.status === 'won') {
        betProfit += bet.stake;
        ledger.push({ round: bet.round_index, type: 'bet', label: 'Bet won', amount: bet.stake, detail: `Team ${bet.predicted_winner}` });
      } else if (bet.status === 'lost') {
        betProfit -= bet.stake;
        ledger.push({ round: bet.round_index, type: 'bet', label: 'Bet lost', amount: -bet.stake, detail: `Team ${bet.predicted_winner}` });
      } else if (bet.status === 'draw') {
        ledger.push({ round: bet.round_index, type: 'bet', label: 'Bet refund', amount: 0, detail: 'Draw' });
      }
    }

    ledger.sort((a, b) => a.round - b.round);
    return { gamesWon, gameEarnings, betProfit, ledger };
  };

  const playerStats = players.map(p => ({ ...p, ...getPlayerStats(p.index) }));

  const sorted = [...playerStats].sort((a, b) => {
    if (tab === 'games') return b.gamesWon - a.gamesWon;
    return b.betProfit - a.betProfit;
  });

  const medalColors = [colors.gold, colors.silver, colors.bronze];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 2,
        padding: 3,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
      }}>
        {(['games', 'betting'] as Tab[]).map(t => {
          const active = tab === t;
          const th = tabTheme[t];
          return (
            <button key={t} onClick={() => { setTab(t); setExpanded(null); }} style={{
              flex: 1,
              padding: `${spacing.sm + 2}px ${spacing.md}px`,
              backgroundColor: active ? th.accent : 'transparent',
              color: active ? colors.bg : colors.textSecondary,
              border: 'none',
              borderRadius: radius.sm,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: fonts.sans,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
            }}>
              <span style={{ display: 'flex', opacity: active ? 1 : 0.6 }}>{th.icon}</span>
              {th.label}
            </button>
          );
        })}
      </div>

      {/* Tab subtitle */}
      <p style={{
        ...typeScale.caption, color: colors.muted, textAlign: 'center',
        margin: 0, marginTop: -spacing.sm,
      }}>
        {theme.subtitle}
      </p>

      {/* Podium — top 3 */}
      {sorted.length >= 3 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          gap: spacing.xl, paddingTop: spacing.sm,
        }}>
          <PodiumSlot player={sorted[1]} rank={1} color={tab === 'games' ? medalColors[1] : colors.accent} tab={tab} />
          <PodiumSlot player={sorted[0]} rank={0} color={tab === 'games' ? medalColors[0] : colors.accent} tab={tab} tall />
          <PodiumSlot player={sorted[2]} rank={2} color={tab === 'games' ? medalColors[2] : colors.accent} tab={tab} />
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
          display: 'grid',
          gridTemplateColumns: tab === 'games' ? '36px 1fr 56px 80px 24px' : '36px 1fr 72px 24px',
          alignItems: 'center', gap: spacing.sm,
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ ...typeScale.micro, color: colors.muted }}>#</span>
          <span style={{ ...typeScale.micro, color: colors.muted }}>Player</span>
          {tab === 'games' && (
            <span style={{ ...typeScale.micro, color: colors.muted, textAlign: 'right' }}>Games</span>
          )}
          <span style={{ ...typeScale.micro, color: colors.muted, textAlign: 'center', lineHeight: 1.3 }}>
            {theme.totalLabel === 'pts_rank' ? (<>pts<br/><span style={{ fontSize: 10, opacity: 0.7 }}>(rank)</span></>) : theme.totalLabel}
          </span>
          <span />
        </div>

        {/* Player rows */}
        {sorted.map((p, rank) => {
          const isExpanded_ = expanded === p.index;
          const isTopThree = rank < 3;
          const filteredLedger = p.ledger.filter(e => tab === 'games' ? e.type === 'game' : e.type === 'bet');
          const displayValue = tab === 'games' ? p.gameEarnings : p.betProfit;
          const mainStat = tab === 'games' ? p.gamesWon : null;

          return (
            <React.Fragment key={p.index}>
              <div
                onClick={() => setExpanded(isExpanded_ ? null : p.index)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: tab === 'games' ? '36px 1fr 56px 80px 24px' : '36px 1fr 72px 24px',
                  alignItems: 'center', gap: spacing.sm,
                  padding: `${spacing.md}px`,
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  backgroundColor: rank === 0 ? (tab === 'games' ? colors.primaryMuted : colors.accentMuted) : 'transparent',
                  transition: 'background-color 0.15s',
                }}
              >
                {/* Rank */}
                {isTopThree ? (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: tab === 'games' ? medalColors[rank] : colors.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900, color: colors.bg,
                    opacity: tab === 'betting' ? (rank === 0 ? 1 : rank === 1 ? 0.7 : 0.5) : 1,
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

                {/* Games won (only in games tab) */}
                {tab === 'games' && mainStat !== null && (
                  <span style={{ ...typeScale.mono, fontSize: 14, color: colors.textSecondary, textAlign: 'right' }}>
                    {mainStat}
                  </span>
                )}

                {/* Value */}
                <span style={{
                  fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                  color: tab === 'games' ? theme.accent : (displayValue >= 0 ? theme.accent : colors.destructive),
                  textAlign: 'center',
                }}>
                  {tab === 'games'
                    ? `+${[50,35,22,12,5][rank] ?? 0}`
                    : `${displayValue > 0 ? '+' : ''}€${displayValue}`
                  }
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
                    {tab === 'games' ? 'Game History' : 'Bet History'}
                  </span>

                  {filteredLedger.length === 0 ? (
                    <span style={{ ...typeScale.caption, color: colors.muted }}>
                      {tab === 'games' ? 'No games played yet' : 'No bets placed yet'}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                      {filteredLedger.map((entry, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: spacing.sm,
                          padding: `${spacing.xs}px 0`,
                          borderBottom: i < filteredLedger.length - 1 ? `1px solid ${colors.border}` : 'none',
                          fontSize: 14,
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: theme.accent,
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
                            color: entry.amount > 0 ? theme.accent : entry.amount < 0 ? colors.destructive : colors.muted,
                          }}>
                            {tab === 'betting'
                              ? `${entry.amount > 0 ? '+' : ''}€${entry.amount}`
                              : `+${entry.detail.split(' ')[0]}`
                            }
                          </span>
                        </div>
                      ))}

                      {/* Total */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        paddingTop: spacing.sm, borderTop: `1px solid ${colors.border}`, marginTop: spacing.xs,
                      }}>
                        <span style={{ ...typeScale.caption, color: colors.textSecondary }}>Total</span>
                        <span style={{
                          fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                          color: displayValue >= 0 ? theme.accent : colors.destructive,
                        }}>
                          {tab === 'games'
                            ? `${mainStat} games`
                            : `${displayValue > 0 ? '+' : ''}€${displayValue}`
                          }
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

function PodiumSlot({ player, rank, color, tall, tab }: {
  player: { name: string; gamesWon: number; gameEarnings: number; betProfit: number };
  rank: number;
  color: string;
  tall?: boolean;
  tab: Tab;
}) {
  const label = tab === 'games'
    ? `${player.gamesWon} W`
    : `${player.betProfit >= 0 ? '+' : ''}€${player.betProfit}`;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: spacing.xs, marginBottom: tall ? 0 : spacing.lg,
    }}>
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
      <span style={{
        ...typeScale.caption, color: colors.text,
        maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {player.name}
      </span>
      <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color }}>
        {label}
      </span>
    </div>
  );
}
