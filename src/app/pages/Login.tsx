import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Baby } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function Login() {
  const { user, loading, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

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

    try {
      if (isRegister) {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setError(error.message ?? 'Failed to create account.');
        } else {
          setMessage('Account created. You can now log in.');
          setIsRegister(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Baby className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold dark:text-white mb-2">Baby Care Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your baby's sleep, feeding, and diaper changes with your family
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-md px-3 py-2">
              {message}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (isRegister ? 'Creating account...' : 'Signing in...') : isRegister ? 'Create account' : 'Sign in'}
          </Button>

          <button
            type="button"
            className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setMessage(null);
            }}
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>

          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            By signing in, you can sync your data across devices and share tracking with family members.
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold dark:text-white mb-3">Features</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>✓ Track sleep positions and duration</li>
            <li>✓ Log feeding schedule and amounts</li>
            <li>✓ Record diaper changes</li>
            <li>✓ Monitor tummy time</li>
            <li>✓ Share with family members</li>
            <li>✓ Export reports for pediatrician</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
