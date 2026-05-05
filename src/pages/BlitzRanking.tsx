import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { getRanking, RankedPlayer } from '@/services/rankingService';

export default function BlitzRanking() {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getRanking().then(({ data }) => {
      setRanking(data);
      setLoading(false);
    });
  }, []);

  const crownHolder = ranking.find(p => p.isCrownHolder);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: `${spacing.xl}px ${spacing.lg}px` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
        <button
          onClick={() => navigate('/blitz')}
          style={{ background: 'none', border: 'none', color: colors.text, fontSize: 20, cursor: 'pointer', padding: spacing.xs }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontFamily: fonts.heading, fontSize: typeScale.xl, fontWeight: 700, color: colors.text, margin: 0 }}>
            Ranking Generale
          </h1>
          <p style={{ fontFamily: fonts.body, fontSize: typeScale.sm, color: colors.textSecondary, margin: 0, marginTop: 2 }}>
            Best 4 of last 6 tournaments
          </p>
        </div>
      </div>

      {/* Crown Section */}
      {crownHolder && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.primaryMuted}, ${colors.accentMuted})`,
          border: `1px solid ${colors.primary}`,
          borderRadius: radius.xl,
          padding: spacing.xl,
          marginBottom: spacing.xl,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: spacing.sm }}>
            {crownHolder.consecutiveWins >= 2 ? '👑🔥' : '👑'}
          </div>
          <p style={{ fontFamily: fonts.body, fontSize: typeScale.xs, color: colors.primary, margin: 0, marginBottom: spacing.xs, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Re del Campo
          </p>
          <p style={{ fontFamily: fonts.heading, fontSize: typeScale['2xl'], fontWeight: 700, color: colors.text, margin: 0 }}>
            {crownHolder.displayName}
          </p>
          {crownHolder.consecutiveWins >= 2 && (
            <p style={{ fontFamily: fonts.body, fontSize: typeScale.sm, color: colors.accent, margin: 0, marginTop: spacing.xs }}>
              Imbattuto — {crownHolder.consecutiveWins} vittorie consecutive
            </p>
          )}
          <p style={{ fontFamily: fonts.mono, fontSize: typeScale.lg, color: colors.primary, margin: 0, marginTop: spacing.md, fontWeight: 700 }}>
            {crownHolder.rankingScore} pts
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ color: colors.textSecondary, textAlign: 'center', fontFamily: fonts.body }}>
          Loading...
        </p>
      )}

      {/* Ranking List */}
      {!loading && ranking.length === 0 && (
        <div style={{ textAlign: 'center', padding: spacing.xxl, color: colors.textSecondary }}>
          <p style={{ fontFamily: fonts.body, fontSize: typeScale.base }}>Nessun ranking ancora.</p>
          <p style={{ fontFamily: fonts.body, fontSize: typeScale.sm, marginTop: spacing.sm }}>Completa un torneo per iniziare!</p>
        </div>
      )}

      {!loading && ranking.map((player, index) => {
        const isExpanded = expanded === player.playerId;
        const isFirst = index === 0;
        const posColor = index === 0 ? colors.gold : index === 1 ? colors.silver : index === 2 ? colors.bronze : colors.textSecondary;

        return (
          <div
            key={player.playerId}
            onClick={() => setExpanded(isExpanded ? null : player.playerId)}
            style={{
              background: isFirst ? colors.primaryMuted : colors.surface,
              border: `1px solid ${isFirst ? colors.primary : colors.border}`,
              borderRadius: radius.lg,
              padding: `${spacing.lg}px ${spacing.lg}px`,
              marginBottom: spacing.md,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Main row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              {/* Position */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isFirst ? colors.primary : 'transparent',
                border: isFirst ? 'none' : `1px solid ${posColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fonts.mono, fontSize: typeScale.sm, fontWeight: 700,
                color: isFirst ? '#000' : posColor,
                flexShrink: 0,
              }}>
                {index + 1}
              </div>

              {/* Name + tournaments */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: fonts.body, fontSize: typeScale.base, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                  {player.displayName}
                  {player.isCrownHolder && <span style={{ fontSize: 14 }}>👑</span>}
                </p>
                <p style={{ fontFamily: fonts.body, fontSize: typeScale.xs, color: colors.textSecondary, margin: 0, marginTop: 2 }}>
                  {player.tournamentsPlayed}/6 tournaments
                </p>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: fonts.mono, fontSize: typeScale.lg, fontWeight: 700, color: isFirst ? colors.primary : colors.text, margin: 0 }}>
                  {player.rankingScore}
                </p>
                <p style={{ fontFamily: fonts.body, fontSize: typeScale.xs, color: colors.textSecondary, margin: 0 }}>
                  pts
                </p>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ marginTop: spacing.lg, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
                <p style={{ fontFamily: fonts.body, fontSize: typeScale.xs, color: colors.textSecondary, margin: 0, marginBottom: spacing.sm }}>
                  Best 4 results counted:
                </p>
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {player.bestResults.map((pts, i) => (
                    <div key={i} style={{
                      background: colors.surfaceElevated,
                      borderRadius: radius.md,
                      padding: `${spacing.xs}px ${spacing.md}px`,
                      fontFamily: fonts.mono,
                      fontSize: typeScale.sm,
                      color: colors.primary,
                      fontWeight: 600,
                    }}>
                      {pts}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom spacer for nav */}
      <div style={{ height: 80 }} />
    </div>
  );
}
