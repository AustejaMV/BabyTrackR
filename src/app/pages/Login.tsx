import { FormEvent, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { checkPasswordBreach } from '../utils/passwordBreachCheck';

type Mode = 'login' | 'signup' | 'forgot';

function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_COLOURS = ['var(--destructive)', 'var(--notice-amber)', 'var(--notice-amber)', 'var(--grn)'];
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

export function Login() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [breachWarning, setBreachWarning] = useState(false);
  const [checkingBreach, setCheckingBreach] = useState(false);
  const breachTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (user && !loading) {
      navigate(redirect ?? '/');
    }
  }, [user, loading, navigate, redirect]);

  const debouncedBreachCheck = useCallback((pw: string) => {
    clearTimeout(breachTimeout.current);
    if (pw.length < 6) { setBreachWarning(false); return; }
    breachTimeout.current = setTimeout(async () => {
      setCheckingBreach(true);
      const breached = await checkPasswordBreach(pw);
      setBreachWarning(breached);
      setCheckingBreach(false);
    }, 600);
  }, []);

  const handlePasswordChange = (pw: string) => {
    setPassword(pw);
    if (mode === 'signup') debouncedBreachCheck(pw);
  };

  const strength = passwordStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setSubmitting(false);
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setSubmitting(false);
        return;
      }
    }

    try {
      if (mode === 'signup') {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setError(error.message ?? 'Failed to create account.');
        } else {
          setMessage('Account created! Check your email to verify, then sign in.');
          setMode('login');
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setError(error.message ?? 'Failed to sign in.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      const { supabase } = await import('../utils/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/callback',
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Password reset link sent. Check your inbox.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      setError('Google sign-in failed. Try again.');
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setMessage(null);
    setBreachWarning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto" style={{ borderColor: 'var(--coral)' }} />
          <p className="mt-4 text-[14px]" style={{ color: 'var(--mu)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full" style={{ maxWidth: 400 }}>
        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <img
            src="/logo-full.png"
            alt="Cradl"
            style={{ height: 80, margin: '0 auto 8px', display: 'block', objectFit: 'contain' }}
          />
          <p className="text-[15px]" style={{ color: 'var(--mu)' }}>
            The baby tracker that tells you why she&apos;s crying.
          </p>
        </div>

        {/* Google button */}
        {mode !== 'forgot' && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-xl border px-4 min-h-[48px] mb-4 font-medium text-[15px]"
            style={{ background: '#fff', borderColor: 'var(--bd)', color: 'var(--tx)' }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
        )}

        {mode !== 'forgot' && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'var(--bd)' }} />
            <span className="text-[12px]" style={{ color: 'var(--mu)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--bd)' }} />
          </div>
        )}

        {/* Forgot password form */}
        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-[15px] font-medium text-center mb-2" style={{ color: 'var(--tx)' }}>Reset password</p>
            <div>
              <Label htmlFor="reset-email" style={{ color: 'var(--tx)', fontSize: 14 }}>Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-h-[44px] mt-1"
                style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
                autoFocus
              />
            </div>

            {error && <div className="text-sm rounded-lg px-3 py-2 border" style={{ color: 'var(--destructive)', borderColor: 'var(--ro)', background: 'var(--ro-bub)' }}>{error}</div>}
            {message && <div className="text-sm rounded-lg px-3 py-2 border" style={{ color: 'var(--grn)', borderColor: 'var(--sa)', background: 'var(--sa)' }}>{message}</div>}

            <Button type="submit" className="w-full min-h-[48px]" disabled={submitting} style={{ background: 'var(--coral)', color: '#fff' }}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
            <button type="button" className="w-full text-[14px]" style={{ color: 'var(--mu)' }} onClick={() => switchMode('login')}>
              Back to sign in
            </button>
          </form>
        ) : (
          /* Login / Signup form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" style={{ color: 'var(--tx)', fontSize: 14 }}>Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-h-[44px] mt-1"
                style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
                required
              />
            </div>
            <div>
              <Label htmlFor="password" style={{ color: 'var(--tx)', fontSize: 14 }}>Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="At least 6 characters"
                className="min-h-[44px] mt-1"
                style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
                required
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <Label htmlFor="confirm-password" style={{ color: 'var(--tx)', fontSize: 14 }}>Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="min-h-[44px] mt-1"
                    style={{ borderColor: 'var(--bd)', background: 'var(--bg2)', color: 'var(--tx)' }}
                    required
                  />
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div>
                    <div className="flex gap-1 mb-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex-1 h-1 rounded-full"
                          style={{
                            background: i < strength ? STRENGTH_COLOURS[strength - 1] : 'var(--bd)',
                            transition: 'background 0.2s',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[12px]" style={{ color: strength > 0 ? STRENGTH_COLOURS[strength - 1] : 'var(--mu)' }}>
                      {strength > 0 ? STRENGTH_LABELS[strength - 1] : 'Too short'}
                    </p>
                  </div>
                )}

                {/* Breach warning */}
                {breachWarning && (
                  <div className="text-[13px] rounded-lg px-3 py-2 border" style={{ color: 'var(--notice-amber)', borderColor: 'var(--notice-amber)', background: 'var(--hl-bg)' }}>
                    This password has appeared in a data breach. Consider choosing a different one.
                  </div>
                )}
                {checkingBreach && (
                  <p className="text-[12px]" style={{ color: 'var(--mu)' }}>Checking password safety…</p>
                )}
              </>
            )}

            {error && <div className="text-sm rounded-lg px-3 py-2 border" style={{ color: 'var(--destructive)', borderColor: 'var(--ro)', background: 'var(--ro-bub)' }}>{error}</div>}
            {message && <div className="text-sm rounded-lg px-3 py-2 border" style={{ color: 'var(--grn)', borderColor: 'var(--sa)', background: 'var(--sa)' }}>{message}</div>}

            <Button type="submit" className="w-full min-h-[48px]" disabled={submitting} style={{ background: 'var(--coral)', color: '#fff' }}>
              {submitting
                ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                : (mode === 'signup' ? 'Create account' : 'Sign in')}
            </Button>

            {mode === 'login' && (
              <button type="button" className="w-full text-[14px]" style={{ color: 'var(--mu)' }} onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            )}

            <button
              type="button"
              className="w-full text-[14px]"
              style={{ color: 'var(--blue2)' }}
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
            </button>
          </form>
        )}

        {/* Continue without account */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[14px]"
            style={{ color: 'var(--mu)' }}
          >
            Continue without account →
          </button>
        </div>
      </div>
    </div>
  );
}
