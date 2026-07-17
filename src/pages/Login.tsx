import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) { navigate('/', { replace: true }); return null; }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setErr('Account created. You can now sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card-gradient rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-cyan-400 grid place-items-center font-display font-bold text-black text-xl">C</div>
          <div>
            <div className="font-display font-bold text-2xl">CIMETRO</div>
            <div className="text-xs text-gray-500 font-mono tracking-widest">AI · AGENT COMPANY</div>
          </div>
        </div>
        <h2 className="font-display text-2xl font-bold mb-1">CEO Sign In</h2>
        <p className="text-gray-400 text-sm mb-6">Access the founder command center.</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button className="btn btn-primary w-full" disabled={busy} type="submit">
            {busy ? 'Working...' : isSignUp ? 'Create CEO account' : 'Sign In'}
          </button>
        </form>

        <div className="my-5 text-center text-xs text-gray-500">— or —</div>

        <button onClick={() => signInWithGoogle('CIMETRO')} className="btn btn-ghost w-full">
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 11v3.2h4.5c-.2 1-.9 3-4.5 3-2.7 0-4.9-2.2-4.9-5s2.2-5 4.9-5c1.5 0 2.6.6 3.2 1.2l2.2-2.1C16.2 5.4 14.3 4.5 12 4.5 7.8 4.5 4.4 7.9 4.4 12s3.4 7.5 7.6 7.5c4.4 0 7.3-3.1 7.3-7.4 0-.5 0-.9-.1-1.3H12z"/></svg>
          Continue with Google
        </button>

        <div className="mt-6 text-center text-sm text-gray-400">
          {isSignUp ? 'Already have an account?' : "New here? "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-violet-300 hover:underline ml-1">
            {isSignUp ? 'Sign in' : 'Create CEO account'}
          </button>
        </div>

        {err && <div className="mt-4 text-sm text-amber-300 text-center">{err}</div>}

        <div className="mt-6 text-center text-xs text-gray-500 font-mono">Founder &middot; CEO &middot; CIMETRO</div>
      </div>
    </div>
  );
}
