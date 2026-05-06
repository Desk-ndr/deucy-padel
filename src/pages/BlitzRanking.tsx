import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';
import { getRanking, RankedPlayer } from '@/services/rankingService';

const FORM_ICONS: Record<string, { symbol: string; color: string; label: string }> = {
  hot:    { symbol: '▲▲', color: colors.primary,     label: 'On fire' },
  up:     { symbol: '▲',  color: colors.primary,     label: 'Rising' },
  down:   { symbol: '▼',  color: colors.destructive, label: 'Dropping' },
  stable: { symbol: '—',  color: colors.textSecondary, label: 'Stable' },
  new:    { symbol: '●',  color: colors.info,        label: 'New' },
};

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
          <h1 style={{ fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize, fontWeight: 700, color: colors.text, margin: 0 }}>
            Overall Ranking
          </h1>
          <p style={{ fontFamily: fonts.sans, fontSize: typeScale.body.fontSize, color: colors.textSecondary, margin: 0, marginTop: 2 }}>
            Best 4 of last 6 tournaments
          </p>
        </div>
      </div>

      {/* Crown Section */}
      {crownHolder && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.primaryMuted}, ${colors.accentMuted})`,
          border: `1px solid ${colors.primary}`,
          borderRadius: radius.lg,
          padding: spacing.xl,
          marginBottom: spacing.xl,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: spacing.sm }}>
            {crownHolder.consecutiveWins >= 2 ? '👑🔥' : '👑'}
          </div>
          <p style={{ fontFamily: fonts.sans, fontSize: typeScale.caption.fontSize, color: colors.primary, margin: 0, marginBottom: spacing.xs, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            King of the Field
          </p>
          <p style={{ fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize, fontWeight: 700, color: colors.text, margin: 0 }}>
            {crownHolder.displayName}
          </p>
          {crownHolder.consecutiveWins >= 2 && (
            <p style={{ fontFamily: fonts.sans, fontSize: typeScale.body.fontSize, color: colors.accent, margin: 0, marginTop: spacing.xs }}>
              Unbeaten — {crownHolder.consecutiveWins} consecutive wins
            </p>
          )}
          <p style={{ fontFamily: fonts.mono, fontSize: typeScale.title.fontSize, color: colors.primary, margin: 0, marginTop: spacing.md, fontWeight: 700 }}>
            {crownHolder.rankingScore} pts
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ color: colors.textSecondary, textAlign: 'center', fontFamily: fonts.sans }}>
          Loading...
        </p>
      )}

      {/* Empty */}
      {!loading && ranking.length === 0 && (
        <div style={{ textAlign: 'center', padding: spacing.xxl, color: colors.textSecondary }}>
          <p style={{ fontFamily: fonts.sans, fontSize: typeScale.body.fontSize }}>No ranking yet.</p>
          <p style={{ fontFamily: fonts.sans, fontSize: typeScale.body.fontSize, marginTop: spacing.sm }}>Complete a tournament to get started!</p>
        </div>
      )}

      {/* Table Header */}
      {!loading && ranking.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 48px 56px 48px 36px',
          gap: spacing.sm,
          padding: `0 ${spacing.lg}px ${spacing.sm}px`,
          alignItems: 'center',
        }}>
          <span style={{ ...headerStyle, textAlign: 'center' }}>#</span>
          <span style={headerStyle}>Player</span>
          <span style={{ ...headerStyle, textAlign: 'center' }}>W%</span>
          <span style={{ ...headerStyle, textAlign: 'right' }}>Pts</span>
          <span style={{ ...headerStyle, textAlign: 'center' }}>+/-</span>
          <span style={{ ...headerStyle, textAlign: 'center' }}>Form</span>
        </div>
      )}

      {/* Ranking Rows */}
      {!loading && ranking.map((player, index) => {
        const isExpanded = expanded === player.playerId;
        const isFirst = index === 0;
        const posColor = index === 0 ? colors.gold : index === 1 ? colors.silver : index === 2 ? colors.bronze : colors.textSecondary;
        const formInfo = FORM_ICONS[player.form] || FORM_ICONS.new;

        return (
          <div
            key={player.playerId}
            onClick={() => setExpanded(isExpanded ? null : player.playerId)}
            style={{
              background: isFirst ? colors.primaryMuted : (index % 2 === 0 ? colors.surface : colors.bg),
              border: `1px solid ${isFirst ? colors.primary : colors.border}`,
              borderRadius: radius.lg,
              padding: `${spacing.md}px ${spacing.lg}px`,
              marginBottom: spacing.xs,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Main row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 48px 56px 48px 36px',
              gap: spacing.sm,
              alignItems: 'center',
            }}>
              {/* Position */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isFirst ? colors.primary : 'transparent',
                border: isFirst ? 'none' : `1.5px solid ${posColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fonts.mono, fontSize: 14, fontWeight: 700,
                color: isFirst ? '#000' : posColor,
              }}>
                {index + 1}
              </div>

              {/* Name + tournaments count */}
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <p style={{
                  fontFamily: fonts.sans, fontSize: typeScale.body.fontSize, fontWeight: 600,
                  color: colors.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'flex', alignItems: 'center', gap: spacing.xs,
                }}>
                  {player.displayName}
                  {player.isCrownHolder && <span style={{ fontSize: 14 }}>👑</span>}
                </p>
                <p style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.muted, margin: 0, marginTop: 1 }}>
                  {player.tournamentsPlayed}T
                </p>
              </div>

              {/* Win Rate */}
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontFamily: fonts.mono, fontSize: 14, fontWeight: 700,
                  color: player.winRate >= 50 ? colors.primary : colors.textSecondary,
                }}>
                  {player.winRate}%
                </span>
              </div>

              {/* Points */}
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontFamily: fonts.mono, fontSize: 16, fontWeight: 800,
                  color: isFirst ? colors.primary : colors.text,
                }}>
                  {player.rankingScore}
                </span>
              </div>

              {/* Delta */}
              <div style={{ textAlign: 'center' }}>
                {player.pointsDelta !== null && player.pointsDelta !== 0 ? (
                  <span style={{
                    fontFamily: fonts.mono, fontSize: 14, fontWeight: 700,
                    color: player.pointsDelta > 0 ? colors.primary : colors.destructive,
                  }}>
                    {player.pointsDelta > 0 ? '+' : ''}{player.pointsDelta}
                  </span>
                ) : (
                  <span style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.muted }}>—</span>
                )}
              </div>

              {/* Form */}
              <div style={{ textAlign: 'center' }} title={formInfo.label}>
                <span style={{
                  fontFamily: fonts.mono, fontSize: 14, fontWeight: 800,
                  color: formInfo.color,
                }}>
                  {formInfo.symbol}
                </span>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` }}>
                <p style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, margin: 0, marginBottom: spacing.sm }}>
                  Best 4 results:
                </p>
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {player.bestResults.map((pts, i) => (
                    <div key={i} style={{
                      background: colors.surfaceElevated,
                      borderRadius: radius.sm,
                      padding: `${spacing.xs}px ${spacing.md}px`,
                      fontFamily: fonts.mono,
                      fontSize: 14,
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

const headerStyle: React.CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 14,
  fontWeight: 600,
  color: colors.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};
