import React, { useState } from 'react';
import { Wallet, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logger } from '../lib/logger';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase || loading) return;
    setError('');
    setMessage('');
    setLoading(true);
    logger.action(mode === 'signup' ? 'AUTH_SIGNUP' : 'AUTH_SIGNIN', { email });
    try {
      if (mode === 'signup') {
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        logger.success('AUTH_SIGNUP', { hasSession: Boolean(data.session) });
        if (!data.session) {
          setMessage('Account created. Check your inbox to confirm your email, then sign in.');
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        logger.success('AUTH_SIGNIN', { email });
      }
    } catch (err) {
      logger.error(mode === 'signup' ? 'AUTH_SIGNUP' : 'AUTH_SIGNIN', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-hairline rounded-2xl p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-ink text-white flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-ink">LedgerFlow</h1>
            <p className="text-xs text-muted">Personal accounts, tasks & monthly cash flow</p>
          </div>
        </div>

        {!isSupabaseConfigured ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <p className="font-semibold">Supabase environment variables missing</p>
            <p>
              Add <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code> to your{' '}
              <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code> file or Vercel settings, then restart the dev server.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 p-1 bg-canvas rounded-xl border border-hairline mb-5">
              <button
                type="button"
                disabled={loading}
                onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  mode === 'signin' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  mode === 'signup' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-canvas border border-hairline rounded-lg focus:outline-none focus:border-ink transition disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-canvas border border-hairline rounded-lg focus:outline-none focus:border-ink transition disabled:opacity-60"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-negative font-medium">
                  {error}
                </div>
              )}
              {message && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-positive font-medium">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-ink hover:bg-neutral-800 text-white text-sm font-semibold transition disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
