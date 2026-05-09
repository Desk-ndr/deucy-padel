import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/lib/phone';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

type State = 'idle' | 'searching' | 'not_found' | 'error' | 'admin_recovery' | 'admin_creating';

const ADMIN_CODE = 'Valencia2026';

export default function BlitzLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  // admin recovery form fields
  const [adminCode, setAdminCode] = useState('');
  const [adminName, setAdminName] = useState('');

  const normalizeForLookup = (raw: string): string => {
    const trimmed = raw.trim();
    const withPrefix = trimmed.startsWith('+') ? trimmed : `+39${trimmed}`;
    return normalizePhone(withPrefix);
  };

  const handleLogin = async () => {
    setError('');
    const trimmed = phone.trim();
    if (trimmed.length < 6) {
      setError('Enter a valid phone number');
      return;
    }
    const normalized = normalizeForLookup(trimmed);

    setState('searching');

    let { data, error: err } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('phone', normalized)
      .maybeSingle();

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

  const handleStartAdminRecovery = () => {
    setState('admin_recovery');
    setError('');
    setAdminCode('');
    setAdminName('');
  };

  const handleSubmitAdminRecovery = async () => {
    setError('');
    if (adminCode.trim() !== ADMIN_CODE) {
      setError('Wrong admin code');
      return;
    }
    if (!adminName.trim()) {
      setError('Enter your name');
      return;
    }
    if (phone.trim().length < 6) {
      setError('Enter a valid phone number');
      return;
    }

    const normalized = normalizeForLookup(phone);
    setState('admin_creating');

    const { data, error: err } = await supabase
      .from('players')
      .insert({ display_name: adminName.trim(), phone: normalized })
      .select('id, display_name')
      .single();

    if (err || !data) {
      setState('admin_recovery');
      // Postgres unique-violation code 23505
      if (err && (err.code === '23505' || /duplicate|unique/i.test(err.message))) {
        setError('A player with this phone already exists. Try logging in instead.');
      } else {
        setError(err?.message || 'Could not create profile. Try again.');
      }
      return;
    }

    localStorage.setItem('deucy-player', JSON.stringify({
      playerId: data.id,
      playerName: data.display_name,
    }));
    navigate('/blitz');
  };

  const isSearching = state === 'searching';
  const isCreating = state === 'admin_creating';
  const showLoginInput = state === 'idle' || state === 'searching' || state === 'error';

  // ── Reusable styles ─────────────────────────────────────────

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: `${spacing.md}px ${spacing.lg}px`,
    background: colors.surface,
    border: `1px solid ${hasError ? colors.destructive : colors.border}`,
    borderRadius: radius.sm,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: typeScale.body.fontSize,
    outline: 'none',
    boxSizing: 'border-box',
  });

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

  const secondaryBtn: React.CSSProperties = {
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
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: fonts.sans,
    fontSize: typeScale.caption.fontSize, color: colors.textSecondary,
    marginBottom: spacing.xs,
  };

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
            color: colors.text, marginBottom: spacing.lg,
            letterSpacing: '-0.03em',
          }}>deucy<span style={{ color: colors.primary }}>.</span></span>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0, marginBottom: spacing.sm,
          }}>
            {state === 'admin_recovery' || state === 'admin_creating'
              ? 'Admin recovery'
              : 'Lost your link?'}
          </h1>
          <p style={{
            fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
            color: colors.textSecondary, margin: 0, lineHeight: 1.5,
          }}>
            {state === 'admin_recovery' || state === 'admin_creating'
              ? 'Enter the admin code and create your profile.'
              : 'Enter your phone number to log in.'}
          </p>
        </div>

        {/* Login (idle / searching / error) */}
        {showLoginInput && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div>
              <label style={labelStyle}>Phone number</label>
              <input
                type="tel"
                placeholder="+39 345 678 9012"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && !isSearching && handleLogin()}
                style={inputStyle(state === 'error')}
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
              style={{ ...primaryBtn, opacity: isSearching ? 0.6 : 1 }}
            >
              {isSearching ? 'Logging in...' : 'Log in'}
            </button>
          </div>
        )}

        {/* Not found — with admin recovery escape hatch */}
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

            <button onClick={handleReset} style={secondaryBtn}>
              Try a different number
            </button>

            {/* Admin recovery escape hatch */}
            <button
              onClick={handleStartAdminRecovery}
              style={{
                background: 'none', border: 'none',
                color: colors.muted, fontFamily: fonts.sans,
                fontSize: typeScale.caption.fontSize, fontWeight: 600,
                cursor: 'pointer', textAlign: 'center', padding: spacing.sm,
                textDecoration: 'underline', textDecorationColor: colors.muted,
                textUnderlineOffset: 3,
              }}
            >
              Are you admin?
            </button>
          </div>
        )}

        {/* Admin recovery form */}
        {(state === 'admin_recovery' || state === 'admin_creating') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div>
              <label style={labelStyle}>Admin code</label>
              <input
                type="password"
                placeholder="••••••"
                value={adminCode}
                onChange={e => { setAdminCode(e.target.value); setError(''); }}
                style={inputStyle(false)}
                autoFocus
                disabled={isCreating}
              />
            </div>

            <div>
              <label style={labelStyle}>Your name</label>
              <input
                type="text"
                placeholder="Andrea"
                value={adminName}
                onChange={e => { setAdminName(e.target.value); setError(''); }}
                style={{ ...inputStyle(false), fontFamily: fonts.sans }}
                disabled={isCreating}
              />
            </div>

            <div>
              <label style={labelStyle}>Phone number</label>
              <input
                type="tel"
                placeholder="+39 345 678 9012"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                style={inputStyle(false)}
                disabled={isCreating}
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
              onClick={handleSubmitAdminRecovery}
              disabled={isCreating}
              style={{ ...primaryBtn, opacity: isCreating ? 0.6 : 1 }}
            >
              {isCreating ? 'Creating profile...' : 'Create my profile'}
            </button>

            <button
              onClick={handleReset}
              disabled={isCreating}
              style={{
                background: 'none', border: 'none',
                color: colors.textSecondary, fontFamily: fonts.sans,
                fontSize: typeScale.caption.fontSize, fontWeight: 600,
                cursor: 'pointer', textAlign: 'center', padding: spacing.sm,
              }}
            >
              ← Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
