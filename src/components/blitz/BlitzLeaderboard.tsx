import React, { useState } from 'react';
import { BlitzPlayer, BlitzRound, BlitzBet } from '@/services/blitzService';
import { BlitzRoundSchedule, EUROS_PER_GAME } from '@/lib/blitz-schedule';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { BETTING_ENABLED } from '@/lib/feature-flags';

const BETTING_BONUS_POINTS = [8, 5, 3, 1, 0];

interface Props {
  crownPlayerName?: string | null;
  players: (BlitzPlayer & { index: number })[];
  rounds: BlitzRound[];
  bets: BlitzBet[];
  schedule: BlitzRoundSchedule[];
  /** Logged-in player's index in the tournament — highlights their row */
  myPlayerIndex?: number | null;
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
    subtitle: 'Ranked by matches won',
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

export default function BlitzLeaderboard({ players, rounds, bets, schedule, crownPlayerName, myPlayerIndex }: Props) {
  const [tab, setTab] = useState<Tab>('games');
  const [expanded, setExpanded] = useState<number | null>(null);
  const completedRounds = rounds.filter(r => r.status === 'completed');
  const theme = tabTheme[tab];

  // Lookup player by ORIGINAL tournament.players index. The players prop
  // is sortedPlayers (sorted by balance), so players[i] would NOT match
  // schedule.teamA/teamB indices, which reference the original positions.
  // We carry .index on each player from the parent so we can resolve here.
  const nameByIndex = (i: number): string => {
    const p = players.find(pp => pp.index === i);
    return p?.name?.split(' ')[0] || '?';
  };

  const getPlayerStats = (playerIndex: number) => {
    let gamesWon = 0;
    let matchesWon = 0;   // 0.5 for draws
    let matchesPlayed = 0;
    let gameEarnings = 0;
    let betProfit = 0;
    const ledger: { round: number; type: 'game' | 'bet'; label: string; amount: number; detail: string; result?: 'win' | 'loss' | 'draw' }[] = [];

    for (const r of completedRounds) {
      const s = schedule[r.round_index - 1];
      if (!s) continue;
      const onA = s.teamA.includes(playerIndex);
      const onB = s.teamB.includes(playerIndex);
      if (onA && r.team_a_score != null) {
        gamesWon += r.team_a_score;
        matchesPlayed += 1;
        const won = r.team_a_score > r.team_b_score! ? 1 : r.team_a_score === r.team_b_score! ? 0.5 : 0;
        matchesWon += won;
        const earned = r.team_a_score * EUROS_PER_GAME;
        gameEarnings += earned;
        const result: 'win' | 'loss' | 'draw' = won === 1 ? 'win' : won === 0.5 ? 'draw' : 'loss';
        const myTeam = s.teamA.map(nameByIndex).join(' & ');
        const opponent = s.teamB.map(nameByIndex).join(' & ');
        ledger.push({ round: r.round_index, type: 'game', label: `${myTeam} vs ${opponent}`, amount: earned, detail: `${r.team_a_score} - ${r.team_b_score}`, result });
      } else if (onB && r.team_b_score != null) {
        gamesWon += r.team_b_score;
        matchesPlayed += 1;
        const won = r.team_b_score > r.team_a_score! ? 1 : r.team_b_score === r.team_a_score! ? 0.5 : 0;
        matchesWon += won;
        const earned = r.team_b_score * EUROS_PER_GAME;
        gameEarnings += earned;
        const result: 'win' | 'loss' | 'draw' = won === 1 ? 'win' : won === 0.5 ? 'draw' : 'loss';
        const myTeam = s.teamB.map(nameByIndex).join(' & ');
        const opponent = s.teamA.map(nameByIndex).join(' & ');
        ledger.push({ round: r.round_index, type: 'game', label: `${myTeam} vs ${opponent}`, amount: earned, detail: `${r.team_b_score} - ${r.team_a_score}`, result });
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
    return { gamesWon, matchesWon, matchesPlayed, gameEarnings, betProfit, ledger };
  };

  const playerStats = players.map(p => ({ ...p, ...getPlayerStats(p.index) }));

  const sorted = [...playerStats].sort((a, b) => {
    if (tab === 'games') {
      // Primary: matches won (draws = 0.5), tiebreaker: games won
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      return b.gamesWon - a.gamesWon;
    }
    return b.betProfit - a.betProfit;
  });

  // Calculate shared placements (so tied players show same ranking points).
  // Built imperatively: each iteration may reference the previous slot, so we
  // must populate the array in order. Using .map() with `placements[rank-1]`
  // crashes with a TDZ ReferenceError when ties exist (e.g. all players 0-0
  // before any round is played) — that's what was breaking the Standings tab.
  const PLACEMENT_PTS: Record<number, number> = { 1: 50, 2: 35, 3: 22, 4: 12, 5: 5 };
  const placements: number[] = [];
  for (let rank = 0; rank < sorted.length; rank++) {
    if (rank === 0) {
      placements.push(1);
      continue;
    }
    const p = sorted[rank];
    const prev = sorted[rank - 1];
    if (tab === 'games') {
      if (p.matchesWon === prev.matchesWon && p.gamesWon === prev.gamesWon) {
        placements.push(placements[rank - 1]);
        continue;
      }
    } else {
      if (p.betProfit === prev.betProfit) {
        placements.push(placements[rank - 1]);
        continue;
      }
    }
    placements.push(rank + 1);
  }

  // Only show betting rank points if there's meaningful differentiation
  // (at least 2 players with different non-zero profits)
  const uniqueProfits = new Set(playerStats.map(p => p.betProfit));
  const hasMeaningfulBetting = uniqueProfits.size > 1 && playerStats.some(p => p.betProfit > 0);
  const allBettingZero = !hasMeaningfulBetting;

  const medalColors = [colors.gold, colors.silver, colors.bronze];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Tab switcher — hidden when betting is off, since a single-tab
          pill row and its subtitle add noise without choice. */}
      {BETTING_ENABLED && (
        <>
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
        </>
      )}

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
          gridTemplateColumns: tab === 'games' ? '36px 1fr 40px 48px 60px 24px' : '36px 1fr 72px 80px 24px',
          alignItems: 'center', gap: spacing.sm,
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ ...typeScale.micro, color: colors.muted }}>#</span>
          <span style={{ ...typeScale.micro, color: colors.muted }}>Player</span>
          {tab === 'games' && (
            <>
              <span style={{ ...typeScale.micro, color: colors.muted, textAlign: 'right' }}>W</span>
              <span style={{ ...typeScale.micro, color: colors.muted, textAlign: 'right' }}>G</span>
            </>
          )}
          <span style={{ ...typeScale.micro, color: colors.muted, textAlign: 'center', lineHeight: 1.3 }}>
            {theme.totalLabel === 'pts_rank' ? (<>pts<br/><span style={{ fontSize: 10, opacity: 0.7 }}>(rank)</span></>) : theme.totalLabel}
          </span>
          {tab === 'betting' && (
            <span style={{ ...typeScale.micro, color: colors.muted, textAlign: 'center', lineHeight: 1.3 }}>
              pts<br/><span style={{ fontSize: 10, opacity: 0.7 }}>(rank)</span>
            </span>
          )}
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
                  gridTemplateColumns: tab === 'games' ? '36px 1fr 40px 48px 60px 24px' : '36px 1fr 72px 80px 24px',
                  alignItems: 'center', gap: spacing.sm,
                  padding: `${spacing.md}px`,
                  borderBottom: `1px solid ${colors.border}`,
                  borderLeft: p.index === myPlayerIndex
                    ? `3px solid ${colors.primary}`
                    : '3px solid transparent',
                  cursor: 'pointer',
                  backgroundColor: p.index === myPlayerIndex
                    ? 'rgba(34,197,94,0.08)'
                    : (rank === 0 ? (tab === 'games' ? colors.primaryMuted : colors.accentMuted) : 'transparent'),
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

                {/* Name + optional guest pill */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...typeScale.body, color: colors.text, fontWeight: 600 }}>
                    {p.name}
                  </span>
                  {(p as any).isGuest && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: colors.accent,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      padding: '1px 5px', background: 'rgba(245,158,11,0.12)',
                      borderRadius: 4,
                    }}>guest</span>
                  )}
                </span>

                {/* Matches won + Games won (only in games tab) */}
                {tab === 'games' && (
                  <>
                    <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 700, color: colors.text, textAlign: 'right' }}>
                      {p.matchesWon % 1 === 0 ? p.matchesWon : p.matchesWon.toFixed(1)}
                    </span>
                    <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 500, color: colors.muted, textAlign: 'right' }}>
                      {p.gamesWon}
                    </span>
                  </>
                )}

                {/* Value */}
                <span style={{
                  fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                  color: tab === 'games' ? theme.accent : (displayValue >= 0 ? theme.accent : colors.destructive),
                  textAlign: 'center',
                }}>
                  {tab === 'games'
                    ? `+${PLACEMENT_PTS[placements[rank]] ?? 0}`
                    : `${displayValue > 0 ? '+' : ''}€${displayValue}`
                  }
                </span>

                {/* Betting ranking points — only if profits differ */}
                {tab === 'betting' && !allBettingZero && (
                  <span style={{
                    fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                    color: colors.primary, textAlign: 'center',
                  }}>
                    +{BETTING_BONUS_POINTS[placements[rank] - 1] ?? 0}
                  </span>
                )}

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
                    {tab === 'games' ? 'Match History' : 'Bet History'}
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
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: entry.result === 'win' ? colors.primary
                              : entry.result === 'loss' ? colors.destructive
                              : entry.result === 'draw' ? colors.accent
                              : theme.accent,
                          }} />
                          <span style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: 14, minWidth: 24 }}>
                            R{entry.round}
                          </span>
                          <span style={{ flex: 1, color: colors.textSecondary, fontFamily: fonts.sans, fontWeight: 500, fontSize: 13, letterSpacing: '-0.02em' }}>
                            {entry.label}
                          </span>
                          {tab === 'betting' && (
                            <span style={{ color: colors.muted, fontSize: 14, marginRight: spacing.sm }}>
                              {entry.detail}
                            </span>
                          )}
                          <span style={{
                            fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                            letterSpacing: '-0.05em',
                            color: tab === 'games'
                              ? (entry.result === 'win' ? colors.primary : entry.result === 'loss' ? colors.destructive : colors.accent)
                              : (entry.amount > 0 ? theme.accent : entry.amount < 0 ? colors.destructive : colors.muted),
                          }}>
                            {tab === 'betting'
                              ? `${entry.amount > 0 ? '+' : ''}€${entry.amount}`
                              : entry.detail
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
                            ? `${p.gamesWon} games`
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
  player: { name: string; gamesWon: number; matchesWon: number; matchesPlayed: number; gameEarnings: number; betProfit: number };
  rank: number;
  color: string;
  tall?: boolean;
  tab: Tab;
}) {
  const label = tab === 'games'
    ? `${player.matchesWon % 1 === 0 ? player.matchesWon : player.matchesWon.toFixed(1)} W`
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
      {(player as any).isGuest && (
        <span style={{
          fontSize: 9, fontWeight: 700, color: colors.accent,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          padding: '1px 5px', background: 'rgba(245,158,11,0.12)',
          borderRadius: 4, marginTop: 2,
        }}>guest</span>
      )}
      <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 14, color }}>
        {label}
      </span>
    </div>
  );
}
