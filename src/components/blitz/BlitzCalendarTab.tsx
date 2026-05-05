import { useState } from 'react';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { LiveBadge } from '@/components/ui/deucy';
import { BlitzTournamentData, BlitzRound } from '@/services/blitzService';

interface Props {
  tournament: BlitzTournamentData;
  rounds: BlitzRound[];
}

export default function BlitzCalendarTab({ tournament, rounds }: Props) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const totalRounds = tournament.total_rounds;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div>
        <h2 style={{ ...typeScale.headline, color: colors.text, margin: 0 }}>
          Full Schedule
        </h2>
        <p style={{ ...typeScale.caption, color: colors.muted, margin: `${spacing.xs}px 0 0` }}>
          {totalRounds} rounds · {Math.floor(tournament.round_duration_seconds / 60)} min each
        </p>
      </div>

      {/* Segmented progress bar */}
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: totalRounds }).map((_, i) => {
          const rn = i + 1;
          const round = rounds.find(r => r.round_index === rn);
          const isCompleted = round?.status === 'completed';
          const isActive = rn === tournament.current_round && tournament.status === 'live';

          return (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              backgroundColor: isCompleted || isActive ? colors.primary : colors.border,
              boxShadow: isActive ? `0 0 8px ${colors.primaryGlow}` : 'none',
              transition: 'all 0.3s',
            }} />
          );
        })}
      </div>

      {/* Round cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {tournament.schedule.map((s, i) => {
          const roundNum = i + 1;
          const round = rounds.find(r => r.round_index === roundNum);
          const isActive = roundNum === tournament.current_round && tournament.status === 'live';
          const isCompleted = round?.status === 'completed';
          const isExpanded = expandedRound === roundNum || isActive;

          return (
            <div
              key={i}
              onClick={() => setExpandedRound(expandedRound === roundNum ? null : roundNum)}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${isActive ? colors.primary : colors.border}`,
                borderRadius: radius.md,
                padding: spacing.md,
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isCompleted ? 0.65 : 1,
                boxShadow: isActive ? `0 0 20px ${colors.primaryGlow}` : 'none',
              }}
            >
              {/* Row header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: isExpanded ? spacing.md : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={{
                    fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                    color: isActive ? colors.primary : colors.text,
                  }}>
                    Round {roundNum}
                  </span>
                  {isActive && <LiveBadge size="sm" />}
                  {isCompleted && (
                    <span style={{
                      ...typeScale.micro,
                      padding: `2px ${spacing.sm}px`,
                      borderRadius: radius.pill,
                      backgroundColor: colors.primaryMuted,
                      color: colors.primary,
                    }}>
                      Done
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  {isCompleted && round && (
                    <span style={{
                      fontFamily: fonts.mono, fontWeight: 800, fontSize: 14,
                      color: colors.primary,
                    }}>
                      {round.team_a_score} - {round.team_b_score}
                    </span>
                  )}
                  {/* Chevron */}
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.muted}
                    strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <>
                  {/* Teams grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center', gap: spacing.sm,
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.xs }}>
                        Team A
                      </span>
                      <p style={{ ...typeScale.body, color: colors.text, fontWeight: 600, margin: 0 }}>
                        {tournament.players[s.teamA[0]]?.name}
                      </p>
                      <p style={{ ...typeScale.body, color: colors.text, fontWeight: 600, margin: 0 }}>
                        {tournament.players[s.teamA[1]]?.name}
                      </p>
                    </div>
                    <span style={{ ...typeScale.caption, color: colors.muted, fontWeight: 800 }}>vs</span>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ ...typeScale.micro, color: colors.muted, display: 'block', marginBottom: spacing.xs }}>
                        Team B
                      </span>
                      <p style={{ ...typeScale.body, color: colors.text, fontWeight: 600, margin: 0 }}>
                        {tournament.players[s.teamB[0]]?.name}
                      </p>
                      <p style={{ ...typeScale.body, color: colors.text, fontWeight: 600, margin: 0 }}>
                        {tournament.players[s.teamB[1]]?.name}
                      </p>
                    </div>
                  </div>

                  {/* Resting players */}
                  {s.rest.length > 0 && (
                    <div style={{
                      marginTop: spacing.md, paddingTop: spacing.sm,
                      borderTop: `1px solid ${colors.border}`,
                      display: 'flex', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center',
                    }}>
                      <span style={{ ...typeScale.micro, color: colors.muted }}>Resting</span>
                      {s.rest.map((idx: number) => (
                        <span key={idx} style={{
                          ...typeScale.caption, color: colors.textSecondary,
                          padding: `2px ${spacing.sm}px`,
                          backgroundColor: colors.bg, borderRadius: radius.pill,
                          border: `1px solid ${colors.border}`,
                        }}>
                          {tournament.players[idx]?.name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
