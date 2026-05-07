import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/lib/phone';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

type State = 'idle' | 'searching' | 'not_found' | 'error';

export default function BlitzLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const trimmed = phone.trim();
    if (trimmed.length < 6) {
      setError('Enter a valid phone number');
      return;
    }
    // Auto-prepend +39 if user typed only digits.
    const withPrefix = trimmed.startsWith('+') ? trimmed : `+39${trimmed}`;
    const normalized = normalizePhone(withPrefix);

    setState('searching');

    // Try exact match first.
    let { data, error: err } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('phone', normalized)
      .maybeSingle();

    // Fallback: try without country code (legacy records).
    if (!data && !err) {
      const localOnly = normalized.replace(/^\+\d{2}/, '');
      const fallback = await supabase
        .from('players')
        .select('id, display_name')
        .eq('phone', localOnly)
        .maybeSingle();
      data = fallback.data;
      err = fallback.error;
    }

    if (err) {
      setState('error');
      setError('Something went wrong. Try again.');
      return;
    }
    if (!data) {
      setState('not_found');
      return;
    }

    // Save identity and redirect straight to home.
    localStorage.setItem('deucy-player', JSON.stringify({
      playerId: data.id,
      playerName: data.display_name,
    }));
    navigate('/blitz');
  };

  const handleReset = () => {
    setState('idle');
    setError('');
  };

  const isSearching = state === 'searching';
  const showInputBlock = state === 'idle' || state === 'searching' || state === 'error';

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing.xl,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Brand + heading */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
          <span style={{
            display: 'block', fontFamily: fonts.brand, fontSize: 22, fontWeight: 900,
            fontStyle: 'italic', color: colors.text, marginBottom: spacing.lg,
            letterSpacing: '-0.02em',
          }}>deucy</span>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0, marginBottom: spacing.sm,
          }}>
            Lost your link?
          </h1>
          <p style={{
            fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
            color: colors.textSecondary, margin: 0, lineHeight: 1.5,
          }}>
            Enter your phone number to log in.
          </p>
        </div>

        {/* Idle / searching / error → input + login button */}
        {showInputBlock && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div>
              <label style={{
                display: 'block', fontFamily: fonts.sans,
                fontSize: typeScale.caption.fontSize, color: colors.textSecondary,
                marginBottom: spacing.xs,
              }}>
                Phone number
              </label>
              <input
                type="tel"
                placeholder="+39 345 678 9012"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && !isSearching && handleLogin()}
                style={{
                  width: '100%',
                  padding: `${spacing.md}px ${spacing.lg}px`,
                  background: colors.surface,
                  border: `1px solid ${state === 'error' ? colors.destructive : colors.border}`,
                  borderRadius: radius.sm,
                  color: colors.text,
                  fontFamily: fonts.mono,
                  fontSize: typeScale.body.fontSize,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                autoFocus
                disabled={isSearching}
              />
            </div>

            {error && (
              <p style={{
                fontFamily: fonts.sans, fontSize: typeScale.caption.fontSize,
                color: colors.destructive, margin: 0,
              }}>
                {error}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={isSearching}
              style={{
                width: '100%',
                padding: `${spacing.md}px`,
                background: colors.primary,
                border: 'none',
                borderRadius: radius.sm,
                color: '#000',
                fontFamily: fonts.sans,
                fontSize: typeScale.body.fontSize,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: isSearching ? 0.6 : 1,
              }}
            >
              {isSearching ? 'Logging in...' : 'Log in'}
            </button>
          </div>
        )}

        {/* Not found */}
        {state === 'not_found' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: radius.lg, padding: spacing.lg,
            }}>
              <p style={{
                fontFamily: fonts.sans, fontSize: 15, fontWeight: 600,
                color: colors.text, margin: 0, marginBottom: spacing.xs,
              }}>
                Not in the pool yet
              </p>
              <p style={{
                fontFamily: fonts.sans, fontSize: 14,
                color: colors.textSecondary, margin: 0, lineHeight: 1.5,
              }}>
                We didn't find that number. Ask the admin to add you to the pool —
                you'll get a personal invite link via WhatsApp.
              </p>
            </div>
            <button
              onClick={handleReset}
              style={{
                width: '100%',
                padding: `${spacing.md}px`,
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                color: colors.text,
                fontFamily: fonts.sans,
                fontSize: typeScale.body.fontSize,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try a different number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
