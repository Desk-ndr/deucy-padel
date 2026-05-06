import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

export default function BlitzJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'welcome' | 'invalid'>('loading');
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    const validate = async () => {
      const { data, error } = await supabase.rpc('validate_access_token', { token });
      if (error || !data || data.length === 0) {
        setStatus('invalid');
        return;
      }
      const player = data[0];
      // Save global identity to localStorage
      localStorage.setItem('deucy-player', JSON.stringify({
        playerId: player.player_id,
        playerName: player.display_name,
      }));
      setPlayerName(player.display_name);
      setStatus('welcome');
      // Redirect after brief welcome
      setTimeout(() => navigate('/blitz'), 1500);
    };

    validate();
  }, [token, navigate]);

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing.xl,
    }}>
      {status === 'loading' && (
        <p style={{ fontFamily: fonts.sans, fontSize: typeScale.body.fontSize, color: colors.textSecondary }}>
          Verifying...
        </p>
      )}

      {status === 'welcome' && (
        <div style={{
          textAlign: 'center',
          animation: 'scaleIn 0.3s ease-out',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: colors.primaryMuted, border: `2px solid ${colors.primary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', marginBottom: spacing.xl,
          }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: colors.primary }}>
              {playerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0, marginBottom: spacing.sm,
          }}>
            Welcome, {playerName}!
          </h1>
          <p style={{
            fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
            color: colors.textSecondary, margin: 0,
          }}>
            You're in the pool. Redirecting...
          </p>
        </div>
      )}

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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0, marginBottom: spacing.sm,
          }}>
            Invalid Link
          </h1>
          <p style={{
            fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
            color: colors.textSecondary, margin: 0, marginBottom: spacing.xl,
          }}>
            This invite link is expired or invalid. Ask the admin for a new one.
          </p>
          <button
            onClick={() => navigate('/blitz/login')}
            style={{
              background: 'none', border: `1px solid ${colors.border}`,
              borderRadius: radius.sm, padding: `${spacing.md}px ${spacing.xl}px`,
              color: colors.textSecondary, fontFamily: fonts.sans,
              fontSize: typeScale.body.fontSize, cursor: 'pointer',
            }}
          >
            Login with phone instead
          </button>
        </div>
      )}
    </div>
  );
}
