import { colors, spacing, radius, fonts } from '@/lib/design-tokens';

interface Props {
  secondsLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
  durationSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

function clock(total: number): string {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The round clock, as a pill that sticks to the top-right of the match tab.
 *
 * It used to be a 140px ring in the middle of the page, which meant that the
 * moment you scrolled down to enter a score the clock was gone — exactly when
 * you want to know whether the round is nearly over. A small pill that stays
 * put costs a corner and answers the question at any scroll position.
 *
 * Rendered inside the sticky status row of the match tab, opposite the round
 * counter.
 *
 * The ring also carried the remaining fraction, so that is kept as a hairline
 * across the bottom of the pill rather than dropped.
 */
export default function BlitzTimer({
  secondsLeft, isRunning, isPaused, isExpired, durationSeconds,
  onStart, onPause, onReset,
}: Props) {
  const remaining = durationSeconds > 0
    ? Math.max(0, Math.min(1, secondsLeft / durationSeconds))
    : 0;

  // One colour carries the state, so the pill needs no label beside it.
  const stateColor = isExpired ? colors.destructive
    : isPaused ? colors.accent
    : colors.primary;

  const circle = {
    width: 30, height: 30, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, padding: 0,
    transition: 'all 0.15s',
  } as const;

  return (
    <div style={{
      // Relative only so the progress hairline can anchor to it. The status
      // row above owns the sticky behaviour, so the round counter and the
      // clock travel together.
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: spacing.xs,
      padding: '5px 10px 5px 5px',
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceElevated,
      border: `1px solid ${isExpired || isPaused ? stateColor : colors.border}`,
      boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
      overflow: 'hidden',
    }}>
      {/* Play / pause */}
      {!isRunning ? (
        <button
          onClick={onStart}
          disabled={isExpired}
          aria-label="Start timer"
          style={{
            ...circle,
            backgroundColor: isExpired ? colors.surface : colors.primary,
            border: 'none',
            cursor: isExpired ? 'default' : 'pointer',
            opacity: isExpired ? 0.4 : 1,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill={isExpired ? colors.muted : colors.bg} stroke="none">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onPause}
          aria-label="Pause timer"
          style={{
            ...circle,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            cursor: 'pointer',
          }}
        >
          <svg width={11} height={11} viewBox="0 0 24 24" fill={colors.text} stroke="none">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </button>
      )}

      {/* Fixed width so the pill does not twitch as the digits change. */}
      <span style={{
        fontFamily: fonts.mono, fontSize: 16, fontWeight: 800,
        letterSpacing: '-0.02em',
        color: isExpired ? colors.destructive : isPaused ? colors.accent : colors.text,
        minWidth: 48, textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {clock(secondsLeft)}
      </span>

      {/* Reset */}
      <button
        onClick={onReset}
        aria-label="Reset timer"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 2, display: 'flex', flexShrink: 0,
          color: colors.textSecondary,
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>

      {/* What is left of the round, in place of the ring. */}
      <div style={{
        position: 'absolute', left: 0, bottom: 0, height: 2,
        width: `${remaining * 100}%`,
        backgroundColor: stateColor,
        transition: 'width 1s linear',
      }} />
    </div>
  );
}
