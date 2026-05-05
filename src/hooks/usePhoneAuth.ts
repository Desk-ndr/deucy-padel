import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: { id: string; phone: string } | null;
  player: { id: string; displayName: string; phone: string } | null;
  loading: boolean;
}

export function usePhoneAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, player: null, loading: true });
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = { id: session.user.id, phone: session.user.phone || '' };
        // Fetch player record
        const { data: player } = await supabase
          .from('players')
          .select('id, display_name, phone')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        
        setAuthState({
          user,
          player: player ? { id: player.id, displayName: player.display_name, phone: player.phone } : null,
          loading: false,
        });
      } else {
        setAuthState({ user: null, player: null, loading: false });
      }
    });

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const user = { id: session.user.id, phone: session.user.phone || '' };
        const { data: player } = await supabase
          .from('players')
          .select('id, display_name, phone')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        setAuthState({
          user,
          player: player ? { id: player.id, displayName: player.display_name, phone: player.phone } : null,
          loading: false,
        });
      } else {
        setAuthState({ user: null, player: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (phone: string) => {
    setError(null);
    setSending(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
      if (otpError) { setError(otpError.message); return false; }
      setOtpSent(true);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    setError(null);
    setSending(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (verifyError) { setError(verifyError.message); return false; }
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  const updateDisplayName = async (name: string) => {
    if (!authState.user) return false;
    const { error: updateError } = await supabase
      .from('players')
      .update({ display_name: name })
      .eq('auth_user_id', authState.user.id);
    if (updateError) { setError(updateError.message); return false; }
    setAuthState(prev => ({
      ...prev,
      player: prev.player ? { ...prev.player, displayName: name } : null,
    }));
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthState({ user: null, player: null, loading: false });
    setOtpSent(false);
  };

  return {
    user: authState.user,
    player: authState.player,
    loading: authState.loading,
    isAuthenticated: !!authState.user,
    otpSent,
    error,
    sending,
    sendOtp,
    verifyOtp,
    updateDisplayName,
    logout,
  };
}
