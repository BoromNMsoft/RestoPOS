import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'cashier';


export interface AuthUser {
  user: User;
  role: UserRole;
  fullName: string;
  stationName?: string;    // ← ajouté
  stationId?: string;      // ← ajouté
    stationActive?: boolean;  // ← ajouté
}

interface AuthContextType {
  authUser: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function profileFromUser(user: User): { role: UserRole; fullName: string } {
  return {
    role: (user.user_metadata?.role ?? user.app_metadata?.role ?? 'cashier') as UserRole,
    fullName: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Utilisateur',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureProfile = useCallback(async () => {
    // Server-side only (SECURITY DEFINER) — évite les erreurs RLS côté client
    await supabase.rpc('ensure_user_profile');
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();
    if (error || !data) return null;

    // Récupère la station assignée
    const { data: assignment } = await supabase
      .from('cashier_assignments')
      .select('station_id, pos_stations(name, is_active)')
      .eq('cashier_id', userId)
      .single();

    return {
      role: data.role as UserRole,
      fullName: data.full_name,
      stationId: assignment?.station_id ?? null,
      stationName: (assignment?.pos_stations as any)?.name ?? null,
      stationActive: (assignment?.pos_stations as any)?.is_active ?? null,
    };
  }, []);

  const loadAuthUser = useCallback(
    async (s: Session): Promise<AuthUser> => {
      let profile = await fetchProfile(s.user.id);
      if (!profile) {
        await ensureProfile();
        profile = await fetchProfile(s.user.id);
      }
      return {
        user: s.user,
        role: profile?.role ?? 'cashier',
        fullName: profile?.fullName ?? s.user.email ?? 'Utilisateur',
        stationId: profile?.stationId ?? undefined,
        stationName: profile?.stationName ?? undefined,
        stationActive: profile?.stationActive ?? undefined,  // ← ajouté
      };
    },
    [ensureProfile, fetchProfile]
  );

  const applySession = useCallback(
    async (s: Session | null) => {
      if (!s?.user) {
        setAuthUser(null);
        setSession(null);
        return;
      }

      setAuthUser(await loadAuthUser(s));
      setSession(s);
    },
    [loadAuthUser]
  );

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      await applySession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      // Defer Supabase calls to avoid auth callback deadlock.
      setTimeout(() => {
        void applySession(s).finally(() => setLoading(false));
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      if (!data.session?.user) {
        return { error: 'Connexion impossible. Réessayez.' };
      }

      setAuthUser(await loadAuthUser(data.session));
      setSession(data.session);
      return { error: null }; 
    },
    [loadAuthUser]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ authUser, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
