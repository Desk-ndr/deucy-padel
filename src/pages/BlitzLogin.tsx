import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

type Step = 'phone' | 'code' | 'success' | 'error';

export default function BlitzLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: find player by phone, generate OTP
  const handleSendCode = async () => {
    setError('');
    const cleaned = phone.replace(/\s/g, '').replace(/^(\+39)?/, '+39');
    if (cleaned.length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setLoading(true);

    const { data, error: err } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('phone', cleaned)
      .maybeSingle();

    if (err || !data) {
      setError('Phone not found in the player pool. Ask the admin for your invite link.');
      setLoading(false);
      return;
    }

    // Generate a simple 4-digit code (stored in-memory only, no SMS in MVP)
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    setExpectedCode(otp);
    setPlayerId(data.id);
    setPlayerName(data.display_name);
    setStep('code');
    setLoading(false);

    // In MVP: show the code as a toast (simulated SMS)
    // In production: send via Twilio/Supabase Auth
    console.log(`[DEV] OTP for ${data.display_name}: ${otp}`);
    alert(`[DEV MODE] Your code is: ${otp}`);
  };

  // Step 2: verify code
  const handleVerifyCode = () => {
    if (code === expectedCode) {
      localStorage.setItem('deucy-player', JSON.stringify({ playerId, playerName }));
      setStep('success');
      setTimeout(() => navigate('/blitz'), 1200);
    } else {
      setError('Wrong code. Try again.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.md}px ${spacing.lg}px`,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: typeScale.body.fontSize,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
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
    opacity: loading ? 0.6 : 1,
  };

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing.xl,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
          <h1 style={{
            fontFamily: fonts.sans, fontSize: typeScale.headline.fontSize,
            fontWeight: 700, color: colors.text, margin: 0, marginBottom: spacing.sm,
          }}>
            Deucy Padel
          </h1>
          <p style={{
            fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
            color: colors.textSecondary, margin: 0,
          }}>
            {step === 'phone' && 'Login with your phone number'}
            {step === 'code' && `Code sent to ${playerName}`}
            {step === 'success' && `Welcome back, ${playerName}!`}
          </p>
        </div>

        {/* Phone step */}
        {step === 'phone' && (
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
                onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                style={inputStyle}
                autoFocus
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
            <button onClick={handleSendCode} disabled={loading} style={btnStyle}>
              {loading ? 'Searching...' : 'Send Code'}
            </button>
          </div>
        )}

        {/* Code step */}
        {step === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <div>
              <label style={{
                display: 'block', fontFamily: fonts.sans,
                fontSize: typeScale.caption.fontSize, color: colors.textSecondary,
                marginBottom: spacing.xs,
              }}>
                4-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5em', fontSize: 24 }}
                autoFocus
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
            <button onClick={handleVerifyCode} style={btnStyle}>
              Verify
            </button>
            <button
              onClick={() => { setStep('phone'); setCode(''); setError(''); }}
              style={{
                background: 'none', border: 'none',
                color: colors.textSecondary, fontFamily: fonts.sans,
                fontSize: typeScale.caption.fontSize, cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Use a different number
            </button>
          </div>
        )}

        {/* Success step */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: colors.primaryMuted, border: `2px solid ${colors.primary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', marginBottom: spacing.lg,
            }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.primary}
                strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{
              fontFamily: fonts.sans, fontSize: typeScale.body.fontSize,
              color: colors.textSecondary, margin: 0,
            }}>
              Redirecting...
            </p>
          </div>
        )}

        {/* Footer link */}
        {step !== 'success' && (
          <p style={{
            textAlign: 'center', marginTop: spacing.xxl,
            fontFamily: fonts.sans, fontSize: typeScale.caption.fontSize,
            color: colors.textMuted,
          }}>
            Have an invite link?{' '}
            <span
              onClick={() => navigate('/')}
              style={{ color: colors.primary, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Use link instead
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
