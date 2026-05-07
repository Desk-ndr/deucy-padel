import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/lib/phone';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

interface FoundPlayer {
  id: string;
  display_name: string;
  access_token: string;
}

type State = 'idle' | 'searching' | 'found' | 'not_found' | 'error';

export default function BlitzLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<State>('idle');
  const [player, setPlayer] = useState<FoundPlayer | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
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
      .select('id, display_name, access_token')
      .eq('phone', normalized)
      .maybeSingle();

    // Fallback: try without country code (user may have been added without prefix).
    if (!data && !err) {
      const localOnly = normalized.replace(/^\+\d{2}/, '');
      const fallback = await supabase
        .from('players')
        .select('id, display_name, access_token')
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
    if (!data || !data.access_token) {
      setState('not_found');
      return;
    }
    setPlayer(data as FoundPlayer);
    setState('found');
  };

  const handleOpen = () => {
    if (!player) return;
    navigate(`/p/${player.access_token}`);
  };

  const handleReset = () => {
    setState('idle');
    setPlayer(null);
    setError('');
  };

  const inputStyle: React.CSSProperties = {
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
  };

  const primaryBtn: React.CSSProperties = {
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
  };

  const isSearching = state === 'searching';

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing.xl,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Brand */}
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
            Enter your phone number and we'll find your invite.
          </p>
        </div>

        {/* Idle / searching / error / not_found */}
        {(state === 'idle' || state === 'searching' || state === 'error' || state === 'not_found') && (
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
                onKeyDown={e => e.key === 'Enter' && !isSearching && handleSearch()}
                style={inputStyle}
                autoFocus
                disabled={isSearching}
              />
            </div>

            {error && state === 'error' && (
              <p style={{
                fontFamily: fonts.sans, fontSize: typeScale.caption.fontSize,
                color: colors.destructive, margin: 0,
              }}>
                {error}
              </p>
            )}

            {state === 'not_found' && (
              <div style={{
                background: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: radius.lg, padding: spacing.lg,
              }}>
                <p style={{
                  fontFamily: fonts.sans, fontSize: 14, fontWeight: 600,
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
            )}

            {error && state !== 'error' && (
              <p style={{
                fontFamily: fonts.sans, fontSize: typeScale.caption.fontSize,
                color: colors.destructive, margin: 0,
              }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSearch}
              disabled={isSearching}
              style={{ ...primaryBtn, opacity: isSearching ? 0.6 : 1 }}
            >
              {isSearching ? 'Searching...' : 'Find my link'}
            </button>
          </div>
        )}

        {/* Found */}
        {state === 'found' && player && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div style={{
              background: colors.surface, border: `1px solid ${colors.primary}`,
              borderRadius: radius.lg, padding: spacing.lg,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md,
            }}>
              {/* Avatar */}
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: colors.primaryMuted, border: `2px solid ${colors.primary}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: colors.primary }}>
                  {player.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontFamily: fonts.sans, fontSize: typeScale.title.fontSize, fontWeight: 700,
                  color: colors.text, margin: 0, marginBottom: spacing.xs,
                }}>
                  {player.display_name}
                </p>
                <p style={{
                  fontFamily: fonts.sans, fontSize: 14,
                  color: colors.textSecondary, margin: 0,
                }}>
                  We found your invite.
                </p>
              </div>
            </div>

            <button onClick={handleOpen} style={primaryBtn}>
              Open my Deucy
            </button>

            <button
              onClick={handleReset}
              style={{
                background: 'none', border: 'none',
                color: colors.textSecondary, fontFamily: fonts.sans,
                fontSize: typeScale.caption.fontSize, cursor: 'pointer',
                textAlign: 'center', padding: spacing.sm,
              }}
            >
              Use a different number
            </button>
          </div>
        )}

        {/* Footer back link */}
        {state !== 'found' && (
          <p style={{
            textAlign: 'center', marginTop: spacing.xxl,
            fontFamily: fonts.sans, fontSize: typeScale.caption.fontSize,
            color: colors.muted,
          }}>
            <span
              onClick={() => navigate('/blitz')}
              style={{ color: colors.primary, cursor: 'pointer', fontWeight: 600 }}
            >
              ← Back to deucy
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
