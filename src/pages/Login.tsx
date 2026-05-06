import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { hashPin } from '@/contexts/PlayerContext';
import { normalizePhone } from '@/lib/phone';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

const REMEMBER_PIN_KEY = 'padel_remember_pin';
const SAVED_PHONE_KEY = 'padel_saved_phone';
const SAVED_PIN_KEY = 'padel_saved_pin';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const tournamentIdParam = searchParams.get('t');
  const navigate = useNavigate();
  const { login, session, isLoading: sessionLoading } = usePlayer();
  const { toast } = useToast();

  const savedRemember = localStorage.getItem(REMEMBER_PIN_KEY) === 'true';
  const savedPhone = savedRemember ? localStorage.getItem(SAVED_PHONE_KEY) || '' : '';
  const savedPin = savedRemember ? localStorage.getItem(SAVED_PIN_KEY) || '' : '';

  const [phone, setPhone] = useState(savedPhone);
  const [pin, setPin] = useState(savedPin);
  const [rememberPin, setRememberPin] = useState(savedRemember);
  const [isLoading, setIsLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [newPin, setNewPin] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (session && !sessionLoading) navigate('/tournaments');
  }, [session, sessionLoading, navigate]);

  const validatePhone = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed.startsWith('+')) {
      setPhoneError('Add country code (ex: +34) so WhatsApp links work.');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (phoneError && value.trim().startsWith('+')) setPhoneError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    validatePhone(phone);
    if (pin.length !== 4) {
      toast({ title: 'Invalid PIN', description: 'PIN must be 4 digits', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const normalizedPhone = normalizePhone(phone);
    const result = await login(normalizedPhone, pin, tournamentIdParam || undefined);
    setIsLoading(false);
    if (result.success) {
      if (rememberPin) {
        localStorage.setItem(REMEMBER_PIN_KEY, 'true');
        localStorage.setItem(SAVED_PHONE_KEY, phone);
        localStorage.setItem(SAVED_PIN_KEY, pin);
      } else {
        localStorage.removeItem(REMEMBER_PIN_KEY);
        localStorage.removeItem(SAVED_PHONE_KEY);
        localStorage.removeItem(SAVED_PIN_KEY);
      }
      toast({ title: 'Welcome back!', description: 'Time to play.' });
      navigate('/tournaments');
    } else {
      toast({ title: 'Login failed', description: result.error || 'Invalid phone or PIN', variant: 'destructive' });
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhone.trim()) {
      toast({ title: 'Enter your phone', description: 'We need your phone number to find your account.', variant: 'destructive' });
      return;
    }
    setIsResetting(true);
    try {
      const normalizedPhone = normalizePhone(resetPhone);
      const { data: players, error } = await supabase
        .from('players')
        .select('id, full_name, tournament_id')
        .eq('phone', normalizedPhone);
      if (error || !players || players.length === 0) {
        toast({ title: 'Not found', description: 'No player found with that phone number.', variant: 'destructive' });
        setIsResetting(false);
        return;
      }
      const player = players[0];
      const generated = String(Math.floor(1000 + Math.random() * 9000));
      const pinHash = hashPin(generated);
      const { error: updateError } = await supabase
        .from('players')
        .update({ pin_hash: pinHash, session_token: null })
        .eq('phone', normalizedPhone);
      if (updateError) {
        toast({ title: 'Error', description: 'Could not reset PIN. Please contact your organizer.', variant: 'destructive' });
        setIsResetting(false);
        return;
      }
      setNewPin(generated);
      toast({ title: 'PIN reset!', description: `New PIN generated for ${player.full_name}` });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  /* ── Styles ─────────────────────────────────────────────── */

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.md}px ${spacing.lg}px`,
    paddingLeft: 40,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.md}px`,
    background: colors.primary,
    border: 'none',
    borderRadius: radius.sm,
    color: '#000',
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    opacity: isLoading ? 0.6 : 1,
  };

  const btnOutline: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.md}px`,
    background: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.textSecondary,
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.muted,
    display: 'flex',
  };

  /* ── Loading spinner ────────────────────────────────────── */

  if (sessionLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: colors.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 32, height: 32, border: `3px solid ${colors.border}`,
          borderTopColor: colors.primary, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: spacing.xl,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: 36, fontWeight: 900,
            color: colors.primary, margin: 0, letterSpacing: '-0.03em',
          }}>
            Deucy
          </h1>
          <p style={{
            ...typeScale.body, color: colors.textSecondary,
            margin: 0, marginTop: spacing.sm,
          }}>
            Enter your phone and PIN to continue
          </p>
        </div>

        {!showReset ? (
          <>
            {/* Login card */}
            <div style={{
              padding: spacing.xl, background: colors.surface,
              borderRadius: radius.md, border: `1px solid ${colors.border}`,
              marginBottom: spacing.lg,
            }}>
              <h2 style={{ ...typeScale.title, color: colors.text, margin: 0, marginBottom: spacing.lg }}>
                Sign In
              </h2>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                {/* Phone */}
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconStyle}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <input
                      type="tel"
                      placeholder="+34 612 345 678"
                      value={phone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      onBlur={() => phone.trim() && validatePhone(phone)}
                      style={{
                        ...inputStyle,
                        borderColor: phoneError ? colors.destructive : colors.border,
                      }}
                      required
                    />
                  </div>
                  {phoneError && (
                    <p style={{ ...typeScale.body, fontSize: 14, color: colors.destructive, margin: 0, marginTop: spacing.xs }}>
                      {phoneError}
                    </p>
                  )}
                </div>

                {/* PIN */}
                <div>
                  <label style={labelStyle}>4-Digit PIN</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconStyle}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="----"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      style={{
                        ...inputStyle,
                        textAlign: 'center',
                        letterSpacing: '0.5em',
                        fontSize: 20,
                        fontFamily: fonts.mono,
                        paddingRight: 40,
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: colors.muted, display: 'flex', padding: 0,
                      }}
                    >
                      {showPin ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ ...typeScale.body, fontSize: 14, color: colors.muted }}>
                    Remember PIN on this device
                  </span>
                  <button
                    type="button"
                    onClick={() => setRememberPin(!rememberPin)}
                    style={{
                      width: 44, height: 24, borderRadius: radius.pill,
                      background: rememberPin ? colors.primary : colors.surfaceElevated,
                      border: `1px solid ${rememberPin ? colors.primary : colors.border}`,
                      cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s, border-color 0.2s',
                      padding: 0, flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: rememberPin ? '#000' : colors.muted,
                      position: 'absolute', top: 2,
                      left: rememberPin ? 22 : 2,
                      transition: 'left 0.2s, background 0.2s',
                    }} />
                  </button>
                </div>

                <button type="submit" disabled={isLoading} style={btnPrimary}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* Forgot PIN link */}
              <button
                onClick={() => { setShowReset(true); setNewPin(null); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
                  width: '100%', marginTop: spacing.md,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: colors.muted, fontFamily: fonts.sans, fontSize: 14,
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                Forgot your PIN?
              </button>
            </div>

            {/* Sign up link */}
            <button
              onClick={() => navigate(tournamentIdParam ? `/join?t=${tournamentIdParam}` : '/join')}
              style={btnOutline}
            >
              Don't have an account? Sign Up
            </button>
          </>
        ) : (
          /* Reset PIN card */
          <div style={{
            padding: spacing.xl, background: colors.surface,
            borderRadius: radius.md, border: `1px solid ${colors.border}`,
          }}>
            <h2 style={{ ...typeScale.title, color: colors.text, margin: 0, marginBottom: spacing.lg }}>
              Reset PIN
            </h2>

            {newPin ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                <p style={{ ...typeScale.body, color: colors.textSecondary, margin: 0 }}>Your new PIN is:</p>
                <p style={{
                  fontFamily: fonts.mono, fontSize: 36, fontWeight: 900,
                  color: colors.primary, letterSpacing: '0.5em',
                  margin: 0,
                }}>
                  {newPin}
                </p>
                <p style={{ ...typeScale.body, color: colors.accent, margin: 0 }}>
                  Save this PIN! It won't be shown again.
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newPin);
                    toast({ title: 'PIN copied!' });
                  }}
                  style={btnOutline}
                >
                  Copy PIN
                </button>
                <button
                  onClick={() => { setShowReset(false); setNewPin(null); setPin(''); }}
                  style={btnPrimary}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPin} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                <p style={{ ...typeScale.body, color: colors.textSecondary, margin: 0 }}>
                  Enter the phone number you signed up with and we'll generate a new PIN.
                </p>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconStyle}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <input
                      type="tel"
                      placeholder="612 345 678"
                      value={resetPhone}
                      onChange={e => setResetPhone(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={isResetting} style={{ ...btnPrimary, opacity: isResetting ? 0.6 : 1 }}>
                  {isResetting ? 'Resetting...' : 'Reset My PIN'}
                </button>
              </form>
            )}

            {!newPin && (
              <button
                onClick={() => setShowReset(false)}
                style={{
                  display: 'block', width: '100%', marginTop: spacing.md,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 14,
                  textAlign: 'center',
                }}
              >
                Back to Sign In
              </button>
            )}
          </div>
        )}

        {/* Admin link */}
        <Link
          to="/admin"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
            marginTop: spacing.xl, textDecoration: 'none',
            color: colors.muted, fontFamily: fonts.sans, fontSize: 14,
            opacity: 0.6,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Admin Panel
        </Link>
      </div>
    </div>
  );
}
