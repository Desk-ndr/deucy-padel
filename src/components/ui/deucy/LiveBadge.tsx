import { colors, typeScale } from '@/lib/design-tokens';

interface LiveBadgeProps {
  /** Label text (default: "LIVE") */
  label?: string;
  /** Dot + text size variant */
  size?: 'sm' | 'md';
}

export default function LiveBadge({ label = 'LIVE', size = 'md' }: LiveBadgeProps) {
  const dotSize = size === 'sm' ? 6 : 8;
  const fontSize = size === 'sm' ? 10 : 11;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: colors.primary,
          animation: 'livePulse 2s ease-in-out infinite',
          boxShadow: '0 0 8px rgba(34,197,94,0.6)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color: colors.primary,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}
