import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabase';
import { handleGoogleRedirect } from '../lib/googleAuth';

const AuthContext = createContext({ user: null as any, session: null as any, loading: true });

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState(null as any);
  const [session, setSession] = useState(null as any);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleGoogleRedirect();
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
