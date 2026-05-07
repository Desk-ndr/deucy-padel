import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getGlobalPlayer, clearGlobalPlayer } from '@/hooks/useBlitzIdentity';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

type Status = 'loading' | 'welcome' | 'invalid' | 'override';

interface IncomingPlayer {
  playerId: string;
  playerName: string;
}

// Detect platform for PWA install hint.
// Note: iOS Chrome reports "CriOS" in UA. Treat anything on iOS as iOS-Safari
// (iOS only allows Add to Home Screen via Safari anyway).
function detectPwaPlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

export default function BlitzJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [incoming, setIncoming] = useState<IncomingPlayer | null>(null);
  const [currentName, setCurrentName] = useState<string>('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    const validate = async () => {
      const { data, error } = await supabase.rpc('validate_access_token', { token });
      if (error || !data || data.length === 0) {
        setStatus('invalid');
        return;
      }
      const player: IncomingPlayer = {
        playerId: data[0].player_id,
        playerName: data[0].display_name,
      };
      setIncoming(player);

      // Override guard: if someone is already logged in as a DIFFERENT player,
      // don't silently overwrite the identity. Ask them to log out first.
      const current = getGlobalPlayer();
      if (current && current.playerId !== player.playerId) {
        setCurrentName(current.playerName);
        setStatus('override');
        return;
      }

      // Same player or no one logged in → save and welcome.
      localStorage.setItem('deucy-player', JSON.stringify(player));
      setStatus('welcome');
    };

    validate();
  }, [token]);

  const handleLogoutAndContinue = () => {
    if (!incoming) return;
    clearGlobalPlayer();
    localStorage.setItem('deucy-player', JSON.stringify(incoming));
    setStatus('welcome');
  };

  const platform = detectPwaPlatform();

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing.xl,
    }}>
      {/* Loading */}
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            width: 32, height: 32, border: `3px solid ${colors.border}`,
            borderTopColor: colors.primary, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ ...typeScale.body, color: colors.textSecondary, margin: 0 }}>
            Verifying your invite...
          </p>
        </div>
      )}

      {/* Welcome */}
      {status === 'welcome' && incoming && (
        <div style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
          {/* Brand */}
          <span style={{
            display: 'block', fontFamily: fonts.brand, fontSize: 22, fontWeight: 900,
            fontStyle: 'italic', color: colors.text, marginBottom: spacing.xl,
            letterSpacing: '-0.02em',
          }}>deucy</span>

          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: colors.primaryMuted, border: `2px solid ${colors.primary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', marginBottom: spacing.lg,
          }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: colors.primary }}>
              {incoming.playerName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0, marginBottom: spacing.sm,
          }}>
            Welcome, {incoming.playerName}.
          </h1>
          <p style={{
            fontFamily: fonts.sans, fontSize: 15,
            color: colors.textSecondary, margin: 0, marginBottom: spacing.xl,
            lineHeight: 1.5,
          }}>
            You're in the Deucy pool. Track your ranking and join Blitz tournaments
            with your group.
          </p>

          {/* What you can do — 3 bullets */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: spacing.md,
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: radius.lg, padding: spacing.lg,
            marginBottom: spacing.xl, textAlign: 'left',
          }}>
            <Bullet
              iconColor={colors.primary}
              icon={(
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              text="Join a Blitz when the host shares it"
            />
            <Bullet
              iconColor={colors.accent}
              icon={(
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              )}
              text="Earn ranking points every match"
            />
            <Bullet
              iconColor={colors.gold}
              icon={(
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22h10c0-2-.85-3.25-2.03-3.79A1.07 1.07 0 0 1 14 17v-2.34" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
                </svg>
              )}
              text="Climb the leaderboard, hold the crown"
            />
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/blitz')}
            style={{
              width: '100%', padding: `${spacing.lg}px`,
              background: colors.primary, border: 'none', borderRadius: radius.sm,
              color: '#000', fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
              fontWeight: 700, cursor: 'pointer', marginBottom: spacing.lg,
            }}
          >
            Open Deucy
          </button>

          {/* Add to Home Screen */}
          <div style={{
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: radius.lg, padding: spacing.lg,
            textAlign: 'left', marginBottom: spacing.lg,
          }}>
            <p style={{
              fontFamily: fonts.sans, fontSize: 14, fontWeight: 600,
              color: colors.text, margin: 0, marginBottom: spacing.xs,
              display: 'flex', alignItems: 'center', gap: spacing.xs,
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.info} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add to Home Screen
            </p>
            <p style={{
              fontFamily: fonts.sans, fontSize: 14,
              color: colors.textSecondary, margin: 0, lineHeight: 1.5,
            }}>
              {platform === 'ios'
                ? 'On iPhone: open this page in Safari, tap Share, then "Add to Home Screen".'
                : platform === 'android'
                ? 'On Android: tap the Chrome menu (three dots), then "Add to Home Screen".'
                : 'Use your browser menu to add this page to your home screen.'
              }
              {' '}Next time, just tap the deucy icon — no link needed.
            </p>
          </div>

          {/* Privacy disclaimer */}
          <p style={{
            fontFamily: fonts.sans, fontSize: 14, color: colors.muted,
            margin: 0, lineHeight: 1.4,
          }}>
            This invite link is personal. Don't share it.
          </p>
        </div>
      )}

      {/* Override (already logged in as someone else) */}
      {status === 'override' && incoming && (
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: colors.accentMuted, border: `2px solid ${colors.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', marginBottom: spacing.xl,
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.accent}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0, marginBottom: spacing.sm,
          }}>
            Already signed in
          </h1>
          <p style={{
            fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
            color: colors.textSecondary, margin: 0, marginBottom: spacing.xl, lineHeight: 1.5,
          }}>
            You're currently signed in as <strong style={{ color: colors.text }}>{currentName}</strong>.
            This invite is for <strong style={{ color: colors.text }}>{incoming.playerName}</strong>.
            Sign out to switch.
          </p>
          <button
            onClick={handleLogoutAndContinue}
            style={{
              width: '100%', padding: `${spacing.lg}px`,
              background: colors.primary, border: 'none', borderRadius: radius.sm,
              color: '#000', fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
              fontWeight: 700, cursor: 'pointer', marginBottom: spacing.md,
            }}
          >
            Sign out & continue as {incoming.playerName}
          </button>
          <button
            onClick={() => navigate('/blitz')}
            style={{
              width: '100%', padding: `${spacing.md}px`,
              background: 'transparent', border: `1px solid ${colors.border}`,
              borderRadius: radius.sm, color: colors.textSecondary,
              fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Stay as {currentName}
          </button>
        </div>
      )}

      {/* Invalid */}
      {status === 'invalid' && (
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: colors.destructiveMuted, border: `2px solid ${colors.destructive}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', marginBottom: spacing.xl,
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.destructive}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0, marginBottom: spacing.sm,
          }}>
            Invalid link
          </h1>
          <p style={{
            fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
            color: colors.textSecondary, margin: 0, marginBottom: spacing.xl, lineHeight: 1.5,
          }}>
            This invite is expired or invalid. Ask the admin for a new one,
            or recover yours below.
          </p>
          <button
            onClick={() => navigate('/blitz/login')}
            style={{
              width: '100%', padding: `${spacing.md}px`,
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: radius.sm, color: colors.text,
              fontFamily: fonts.sans, fontSize: typeScale.body.fontSize, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Lost your link?
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Bullet sub-component ─────────────────────────────────────── */

function Bullet({ icon, iconColor, text }: { icon: React.ReactNode; iconColor: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
      <div style={{
        width: 28, height: 28, borderRadius: radius.sm,
        background: `${iconColor}1A`, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{
        fontFamily: fonts.sans, fontSize: 14, color: colors.text,
        fontWeight: 500, lineHeight: 1.4,
      }}>{text}</span>
    </div>
  );
}
