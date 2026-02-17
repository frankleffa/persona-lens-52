import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInDev: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => { },
  signInDev: () => { },
});

const MOCK_SESSION: Session = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'dev-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'dev@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmation_sent_at: '',
    confirmed_at: '',
    last_sign_in_at: '',
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: 'Dev User' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    identities: [],
    factors: [],
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for dev session first
    const isDev = localStorage.getItem('dev_session');
    if (isDev) {
      setSession(MOCK_SESSION);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem('dev_session');
    await supabase.auth.signOut();
    setSession(null);
  };

  const signInDev = () => {
    localStorage.setItem('dev_session', 'true');
    setSession(MOCK_SESSION);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut, signInDev }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
