import { BlitzPlayer } from '@/services/blitzService';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

interface Props {
  players: BlitzPlayer[];
  onPick: (index: number, name: string) => void;
  onSpectate: () => void;
}

export default function BlitzIdentityPicker({ players, onPick, onSpectate }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      backgroundColor: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing.lg,
    }}>
      <div style={{
        maxWidth: 380, width: '100%',
        display: 'flex', flexDirection: 'column', gap: spacing.xl,
        textAlign: 'center',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}>
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={colors.primary}
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h2 style={{ ...typeScale.headline, color: colors.text, margin: 0 }}>
            Who are you?
          </h2>
          <p style={{ ...typeScale.caption, color: colors.muted, margin: 0 }}>
            Tap your name to join
          </p>
        </div>

        {/* Player buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {players.map((p, i) => (
            <button
              key={i}
              onClick={() => onPick(i, p.name)}
              style={{
                width: '100%', padding: spacing.lg,
                backgroundColor: colors.surface,
                border: `2px solid ${colors.border}`,
                borderRadius: radius.md,
                textAlign: 'left', cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: fonts.sans,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = colors.primary;
                (e.currentTarget as HTMLElement).style.backgroundColor = colors.primaryMuted;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = colors.border;
                (e.currentTarget as HTMLElement).style.backgroundColor = colors.surface;
              }}
            >
              <span style={{ ...typeScale.title, color: colors.text }}>
                {p.name}
              </span>
            </button>
          ))}
        </div>

        {/* Spectate button */}
        <button
          onClick={onSpectate}
          style={{
            width: '100%', padding: spacing.md,
            backgroundColor: 'transparent',
            border: 'none', cursor: 'pointer',
            ...typeScale.caption,
            color: colors.muted,
            fontFamily: fonts.sans,
          }}
        >
          Just watching
        </button>
      </div>
    </div>
  );
}
