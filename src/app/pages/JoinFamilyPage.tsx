import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { serverUrl, supabaseAnonKey } from '../utils/supabase';
import { Button } from '../components/ui/button';
import { Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { FamilyRole } from '../types/family';

const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: 'Owner',
  partner: 'Partner',
  caregiver: 'Caregiver',
  viewer: 'Viewer',
};

interface InviteInfo {
  inviterName: string;
  familyName: string;
  role: FamilyRole;
  email: string;
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'not-signed-in' }
  | { kind: 'error'; message: string }
  | { kind: 'valid'; invite: InviteInfo }
  | { kind: 'joining' }
  | { kind: 'joined' };

export function JoinFamilyPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  useEffect(() => {
    if (authLoading) return;

    if (!user || !session?.access_token) {
      setState({ kind: 'not-signed-in' });
      return;
    }

    if (!token) {
      setState({ kind: 'error', message: 'No invite token provided.' });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${serverUrl}/family/invite-info?token=${encodeURIComponent(token)}`, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 404) {
            setState({ kind: 'error', message: 'This invite link was not found or has expired.' });
          } else if (res.status === 403) {
            setState({ kind: 'error', message: data.error ?? 'This invite is for a different email address.' });
          } else {
            setState({ kind: 'error', message: data.error ?? 'Something went wrong.' });
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setState({
            kind: 'valid',
            invite: {
              inviterName: data.inviterName ?? 'Someone',
              familyName: data.familyName ?? 'A family',
              role: data.role ?? 'partner',
              email: data.email ?? '',
            },
          });
        }
      } catch {
        if (!cancelled) setState({ kind: 'error', message: 'Network error. Please try again.' });
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, session, token]);

  const handleJoin = async () => {
    if (!session?.access_token || !token) return;
    setState({ kind: 'joining' });
    try {
      const res = await fetch(`${serverUrl}/family/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.familyId) {
        setState({ kind: 'joined' });
        toast.success('Welcome to the family!');
        setTimeout(() => navigate('/'), 1500);
      } else {
        setState({ kind: 'error', message: data.error ?? 'Could not join. The link may have expired.' });
      }
    } catch {
      setState({ kind: 'error', message: 'Network error. Please try again.' });
    }
  };

  const handleDecline = async () => {
    if (!session?.access_token || !token) return;
    try {
      await fetch(`${serverUrl}/family/decline-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch { /* best effort */ }
    toast('Invite declined.');
    navigate('/');
  };

  const containerStyle: React.CSSProperties = {
    background: 'var(--bg)',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)',
    borderColor: 'var(--bd)',
    maxWidth: 400,
    width: '100%',
    borderRadius: 16,
    padding: '2rem 1.5rem',
    border: '1px solid var(--bd)',
    textAlign: 'center' as const,
  };

  if (state.kind === 'loading' || authLoading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: 'var(--coral)' }} />
          <p className="text-[14px]" style={{ color: 'var(--mu)' }}>Checking invite…</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'not-signed-in') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--notice-amber)' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--tx)' }}>Sign in required</h2>
          <p className="text-[14px] mb-4" style={{ color: 'var(--mu)' }}>
            You need to sign in before you can join a family. After signing in, come back to this link.
          </p>
          <Link to={`/login?redirect=${encodeURIComponent(`/join-family/${token ?? ''}`)}`}>
            <Button className="w-full min-h-[48px]" style={{ background: 'var(--coral)', color: '#fff' }}>
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <XCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--destructive)' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--tx)' }}>Can&apos;t join</h2>
          <p className="text-[14px] mb-4" style={{ color: 'var(--mu)' }}>{state.message}</p>
          <Link to="/">
            <Button variant="outline" className="w-full min-h-[48px]">Go to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === 'joined') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--grn)' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--tx)' }}>You&apos;re in!</h2>
          <p className="text-[14px]" style={{ color: 'var(--mu)' }}>Redirecting to home…</p>
        </div>
      </div>
    );
  }

  const invite = state.kind === 'valid' ? state.invite : null;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--blue)' }} />
        <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--tx)' }}>Join family</h2>
        <p className="text-[14px] mb-5" style={{ color: 'var(--mu)' }}>
          <strong>{invite?.inviterName}</strong> invited you to join <strong>{invite?.familyName}</strong>
        </p>

        <div className="rounded-xl border p-3 mb-5 text-left" style={{ borderColor: 'var(--bd)', background: 'var(--bg2)' }}>
          <div className="flex justify-between text-[13px] mb-1">
            <span style={{ color: 'var(--mu)' }}>Family</span>
            <span style={{ color: 'var(--tx)' }}>{invite?.familyName}</span>
          </div>
          <div className="flex justify-between text-[13px] mb-1">
            <span style={{ color: 'var(--mu)' }}>Invited by</span>
            <span style={{ color: 'var(--tx)' }}>{invite?.inviterName}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--mu)' }}>Your role</span>
            <span className="font-medium" style={{ color: 'var(--coral)' }}>{invite?.role ? ROLE_LABELS[invite.role] : '—'}</span>
          </div>
        </div>

        <Button
          className="w-full min-h-[48px] mb-3"
          style={{ background: 'var(--coral)', color: '#fff' }}
          onClick={handleJoin}
          disabled={state.kind === 'joining'}
        >
          {state.kind === 'joining' ? 'Joining…' : 'Join family'}
        </Button>

        <button
          type="button"
          onClick={handleDecline}
          className="text-[14px] underline"
          style={{ color: 'var(--mu)' }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
