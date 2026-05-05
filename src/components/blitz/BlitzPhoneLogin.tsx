import { useState } from 'react';
import { usePhoneAuth } from '@/hooks/usePhoneAuth';
import { colors, spacing, radius, fonts, typeScale } from '@/lib/design-tokens';

interface BlitzPhoneLoginProps {
  onAuthenticated: () => void;
}

export function BlitzPhoneLogin({ onAuthenticated }: BlitzPhoneLoginProps) {
  const { sendOtp, verifyOtp, updateDisplayName, otpSent, error, sending, isAuthenticated, player } = usePhoneAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');

  const handleSendOtp = async () => {
    const formatted = phone.startsWith('+') ? phone : `+39${phone}`;
    const ok = await sendOtp(formatted);
    if (ok) setStep('otp');
  };

  const handleVerifyOtp = async () => {
    const formatted = phone.startsWith('+') ? phone : `+39${phone}`;
    const ok = await verifyOtp(formatted, otp);
    if (ok) setStep('name');
  };

  const handleSetName = async () => {
    if (!name.trim()) return;
    await updateDisplayName(name.trim());
    onAuthenticated();
  };

  // If already authenticated with a name, skip
  if (isAuthenticated && player?.displayName && player.displayName !== 'Player') {
    onAuthenticated();
    return null;
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: spacing[6],
    background: colors.bg.primary,
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '360px',
    padding: spacing[6],
    background: colors.bg.surface,
    borderRadius: radius.xl,
    border: `1px solid ${colors.border.subtle}`,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: fonts.heading,
    fontSize: typeScale['2xl'].size,
    fontWeight: 600,
    color: colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: spacing[2],
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily: fonts.body,
    fontSize: typeScale.sm.size,
    color: colors.text.muted,
    textAlign: 'center' as const,
    marginBottom: spacing[5],
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typeScale.base.size,
    fontFamily: fonts.mono,
    background: colors.bg.primary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    outline: 'none',
    letterSpacing: step === 'otp' ? '0.3em' : 'normal',
    textAlign: step === 'otp' ? 'center' as const : 'left' as const,
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typeScale.base.size,
    fontFamily: fonts.body,
    fontWeight: 600,
    background: colors.primary,
    color: '#000',
    border: 'none',
    borderRadius: radius.md,
    cursor: sending ? 'wait' : 'pointer',
    opacity: sending ? 0.6 : 1,
    marginTop: spacing[4],
  };

  const errorStyle: React.CSSProperties = {
    fontSize: typeScale.sm.size,
    color: colors.accent,
    textAlign: 'center' as const,
    marginTop: spacing[2],
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>
          {step === 'phone' ? 'Entra in Deucy' : step === 'otp' ? 'Codice OTP' : 'Come ti chiami?'}
        </h1>
        <p style={subtitleStyle}>
          {step === 'phone'
            ? 'Inserisci il tuo numero per identificarti'
            : step === 'otp'
            ? 'Inserisci il codice ricevuto via SMS'
            : 'Scegli il nome che vedranno gli altri'}
        </p>

        {step === 'phone' && (
          <>
            <input
              style={inputStyle}
              type="tel"
              placeholder="333 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
            />
            <button style={buttonStyle} onClick={handleSendOtp} disabled={sending || !phone.trim()}>
              {sending ? 'Invio...' : 'Invia codice'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <input
              style={inputStyle}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
            />
            <button style={buttonStyle} onClick={handleVerifyOtp} disabled={sending || otp.length < 6}>
              {sending ? 'Verifica...' : 'Conferma'}
            </button>
            <button
              style={{ ...buttonStyle, background: 'transparent', color: colors.text.muted, border: `1px solid ${colors.border.subtle}` }}
              onClick={() => { setStep('phone'); setOtp(''); }}
            >
              Cambia numero
            </button>
          </>
        )}

        {step === 'name' && (
          <>
            <input
              style={{ ...inputStyle, letterSpacing: 'normal', textAlign: 'left' }}
              type="text"
              placeholder="Es: Marco"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
              maxLength={20}
            />
            <button style={buttonStyle} onClick={handleSetName} disabled={!name.trim()}>
              Iniziamo
            </button>
          </>
        )}

        {error && <p style={errorStyle}>{error}</p>}
      </div>
    </div>
  );
}
