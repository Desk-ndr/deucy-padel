import { colors, typeScale, shadows } from '@/lib/design-tokens';

interface TimerRingProps {
  /** Seconds remaining */
  timeLeft: number;
  /** Total seconds for this round */
  totalTime: number;
  /** Ring diameter in px (default 120) */
  size?: number;
  /** Show linear progress bar below ring */
  showBar?: boolean;
}

export default function TimerRing({ timeLeft, totalTime, size = 120, showBar = true }: TimerRingProps) {
  const isUrgent = timeLeft <= 60;
  const strokeColor = isUrgent ? colors.destructive : colors.primary;
  const glowShadow = isUrgent ? shadows.dangerGlow : shadows.heroGlow;

  const r = (size / 2) - 10; // radius with padding for stroke
  const circumference = 2 * Math.PI * r;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const dashOffset = circumference * (1 - progress);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Ring + number */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Radial glow behind */}
        <div
          style={{
            position: 'absolute',
            inset: -20,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${isUrgent ? colors.destructiveGlow : colors.primaryGlow} 0%, transparent 70%)`,
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        />

        {/* SVG ring */}
        <svg
          width={size}
          height={size}
          style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors.border}
            strokeWidth={3}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
              filter: isUrgent ? `drop-shadow(0 0 6px ${colors.destructiveGlow})` : 'none',
            }}
          />
        </svg>

        {/* Time display */}
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            fontSize: size > 100 ? 40 : 28,
            fontWeight: 900,
            fontFamily: typeScale.mono.fontFamily,
            color: isUrgent ? colors.destructive : colors.text,
            letterSpacing: '-0.02em',
            animation: isUrgent ? 'timerPulse 1s ease-in-out infinite' : 'none',
          }}
        >
          {display}
        </span>
      </div>

      {/* Linear progress bar */}
      {showBar && (
        <div
          style={{
            width: '100%',
            maxWidth: size + 40,
            height: 3,
            borderRadius: 2,
            backgroundColor: colors.border,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              borderRadius: 2,
              backgroundColor: strokeColor,
              transition: 'width 0.5s ease, background-color 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
