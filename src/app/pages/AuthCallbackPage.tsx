import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleCallback = async () => {
    try {
      setError(null);
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (data.session) {
        navigate('/', { replace: true });
      } else {
        setError('No session found. Please try signing in again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  useEffect(() => {
    handleCallback();
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          padding: '1.5rem',
          background: 'var(--bg)',
          color: 'var(--tx)',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          gap: '1rem',
        }}
      >
        <h2 style={{ fontFamily: 'Georgia, serif', margin: 0 }}>
          Sign-in failed
        </h2>
        <p style={{ color: 'var(--mu)', maxWidth: '24rem' }}>{error}</p>
        <button
          onClick={handleCallback}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: 'var(--radius)',
            background: 'var(--coral)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          Retry
        </button>
        <button
          onClick={() => navigate('/login', { replace: true })}
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: 'var(--radius)',
            background: 'transparent',
            color: 'var(--mu)',
            border: '1px solid var(--bd)',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--mu)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      Signing you in…
    </div>
  );
}
