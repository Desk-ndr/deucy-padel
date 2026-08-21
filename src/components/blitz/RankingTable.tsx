// Shared building blocks for the ranking table.
//
// The full ranking page and the preview card on the home page render the
// exact same row from here, so the two can never drift apart: change a
// column width or a colour once and both follow.

import React from 'react';
import { RankedPlayer } from '@/services/rankingService';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

/** Column template shared by the header and every row. Widths are chosen so
 *  each header label fits inside its own track at the header font size. */
export const ROW_GRID = '26px minmax(104px, 1fr) 42px 48px 46px 52px';
export const ROW_GAP = spacing.xs;
export const ROW_PAD_X = spacing.md;

/** Below this the columns would squeeze names and numbers, so the table
 *  stops shrinking and scrolls sideways instead. */
export const TABLE_MIN_WIDTH =
  26 + 104 + 42 + 48 + 46 + 52 + (ROW_GAP * 5) + (ROW_PAD_X * 2);

const headerStyle: React.CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 10,
  fontWeight: 700,
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  // Never let a label widen its track or bleed into the next column.
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

/**
 * Bordered container that scrolls horizontally as one piece. Header and
 * rows live inside it together, so they always move in step and stay
 * aligned even on the narrowest phone.
 */
export function RankingTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{ minWidth: TABLE_MIN_WIDTH }}>
        {children}
      </div>
    </div>
  );
}

export function RankingTableHeader() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: ROW_GRID,
      gap: ROW_GAP,
      padding: `${spacing.sm}px ${ROW_PAD_X}px`,
      alignItems: 'center',
      background: colors.bg,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <span style={{ ...headerStyle, textAlign: 'center' }}>#</span>
      <span style={headerStyle}>Player</span>
      <span style={{ ...headerStyle, textAlign: 'right' }}>Pts</span>
      <span style={{ ...headerStyle, textAlign: 'center' }}>Played</span>
      <span style={{ ...headerStyle, textAlign: 'center' }}>Win%</span>
      <span style={{ ...headerStyle, textAlign: 'center' }}>Game%</span>
    </div>
  );
}

/**
 * The six cells of a ranking row.
 *
 * `showDelta` puts the points won in the latest tournament under the score.
 * It sits inside the points cell rather than in a column of its own, so the
 * grid stays identical to the header and to the full ranking page.
 */
export function RankingRowCells({
  player, index, showDelta = false,
}: {
  player: RankedPlayer;
  index: number;
  showDelta?: boolean;
}) {
  const isFirst = index === 0;
  const posColor = index === 0 ? colors.gold
    : index === 1 ? colors.silver
    : index === 2 ? colors.bronze
    : colors.textSecondary;
  const delta = player.pointsDelta;
  const hasDelta = showDelta && delta !== null && delta !== 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: ROW_GRID,
      gap: ROW_GAP,
      alignItems: 'center',
    }}>
      {/* Position */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        justifySelf: 'center',
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
          color: colors.text, margin: 0, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
          display: 'flex', alignItems: 'center', gap: spacing.xs,
        }}>
          {player.displayName}
          {player.isCrownHolder && (
            <svg width={14} height={14} viewBox="0 0 24 24" fill={colors.accent} stroke="none"
              style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
              <path d="M2 20h20l-2-8-4 4-4-8-4 8-4-4z" />
            </svg>
          )}
        </p>
        <p style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.muted, margin: 0, marginTop: 1 }}>
          {player.tournamentsPlayed}T
        </p>
      </div>

      {/* Points — hero stat, with the latest gain underneath when asked */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: fonts.mono, fontSize: 18, fontWeight: 900,
          color: isFirst ? colors.primary : colors.text,
          lineHeight: 1.1,
        }}>
          {player.rankingScore}
        </div>
        {hasDelta && (
          <div style={{
            fontFamily: fonts.mono, fontSize: 11, fontWeight: 700,
            color: delta! > 0 ? colors.primary : colors.destructive,
            marginTop: 1,
          }}>
            {delta! > 0 ? '+' : ''}{delta}
          </div>
        )}
      </div>

      {/* Matches played */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 500, color: colors.text }}>
          {player.matchesPlayed || '—'}
        </span>
      </div>

      {/* Win rate */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 500, color: colors.text }}>
          {player.matchesPlayed ? `${player.winRate}%` : '—'}
        </span>
      </div>

      {/* Game rate */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 500, color: colors.text }}>
          {player.matchesPlayed ? `${player.gameRate}%` : '—'}
        </span>
      </div>
    </div>
  );
}

/** Segmented Singles / Pairs switch, used above both tables. */
export function RankingFormatTabs({
  value, onChange,
}: {
  value: 'rotating' | 'fixed_pairs';
  onChange: (v: 'rotating' | 'fixed_pairs') => void;
}) {
  return (
    <div style={{
      display: 'flex',
      padding: 3,
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      boxSizing: 'border-box',
      width: '100%',
    }}>
      {([
        { key: 'rotating' as const, label: 'Singles' },
        { key: 'fixed_pairs' as const, label: 'Pairs' },
      ]).map(t => {
        const isActive = value === t.key;
        return (
          <button
            key={t.key}
            onClick={e => { e.stopPropagation(); onChange(t.key); }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: `${spacing.sm}px 0`,
              borderRadius: 9,
              backgroundColor: isActive ? colors.surfaceElevated : 'transparent',
              border: 'none',
              color: isActive ? colors.text : colors.muted,
              fontSize: 14,
              fontWeight: isActive ? 700 : 600,
              fontFamily: fonts.sans,
              cursor: 'pointer',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.45)' : 'none',
              transition: 'background-color 0.2s, color 0.2s, box-shadow 0.2s',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
