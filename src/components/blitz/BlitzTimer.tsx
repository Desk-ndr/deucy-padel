import { colors, spacing, radius, fonts } from '@/lib/design-tokens';
import { TimerRing } from '@/components/ui/deucy';

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

export default function BlitzTimer({
  secondsLeft, isRunning, isPaused, isExpired, durationSeconds,
  onStart, onPause, onReset,
}: Props) {
  const iconColor = colors.text;
  const iconMuted = colors.muted;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: `${spacing.xl}px 0`,
    }}>
      {/* Timer ring */}
      <TimerRing
        timeLeft={secondsLeft}
        totalTime={durationSeconds}
        size={140}
        showBar={true}
      />

      {/* Controls — accessible to everyone, not just creator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        marginTop: spacing.lg,
      }}>
        {/* Play / Pause */}
        {!isRunning ? (
          <button
            onClick={onStart}
            disabled={isExpired}
            style={{
              width: 48, height: 48,
              borderRadius: '50%',
              backgroundColor: isExpired ? colors.surfaceElevated : colors.primary,
              border: 'none',
              cursor: isExpired ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isExpired ? 0.4 : 1,
              transition: 'all 0.15s',
            }}
          >
            {/* Play icon */}
            <svg width={20} height={20} viewBox="0 0 24 24" fill={colors.bg} stroke="none">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onPause}
            style={{
              width: 48, height: 48,
              borderRadius: '50%',
              backgroundColor: colors.surfaceElevated,
              border: `2px solid ${colors.border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {/* Pause icon */}
            <svg width={18} height={18} viewBox="0 0 24 24" fill={iconColor} stroke="none">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>
        )}

        {/* Reset */}
        <button
          onClick={onReset}
          style={{
            width: 40, height: 40,
            borderRadius: '50%',
            backgroundColor: colors.surfaceElevated,
            border: `1px solid ${colors.border}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          {/* Reset icon */}
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={iconMuted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
      </div>

      {/* Status label */}
      {isExpired && (
        <span style={{
          marginTop: spacing.md,
          fontSize: 14, fontWeight: 700,
          color: colors.destructive,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        }}>
          Time's up
        </span>
      )}
      {isPaused && !isExpired && (
        <span style={{
          marginTop: spacing.md,
          fontSize: 14, fontWeight: 600,
          color: colors.accent,
        }}>
          Paused
        </span>
      )}
    </div>
  );
}
