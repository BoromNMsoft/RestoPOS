import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'cashier';

export interface AuthUser {
  user: User;
  role: UserRole;
  fullName: string;
  phone?: string;           // ← ajouté
  restaurantId?: string | null;   // ← ajoute
  restaurantName?: string;        // ← ajoute
  restaurantLogo?: string | null; // ← ajoute
  restaurantSuspended?: boolean;  // ← ajoute
  stationName?: string;
  stationId?: string;
  stationActive?: boolean;
}

interface AuthContextType {
  authUser: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;  // ← phone au lieu de email
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convertit un numéro de téléphone en email factice pour Supabase
function phoneToFakeEmail(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  return `${digitsOnly}@restopos.local`;
}

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
    await supabase.rpc('ensure_user_profile');
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, full_name, phone, restaurant_id')  // ← ajoute phone
      .eq('id', userId)
      .single();
    if (error || !data) return null;

    const { data: assignment } = await supabase
      .from('cashier_assignments')
      .select('station_id, pos_stations(name, is_active)')
      .eq('cashier_id', userId)
      .single();

    // ← récupère le resto courant
    let restaurantName: string | undefined;
    let restaurantLogo: string | null | undefined;
    let restaurantSuspended = false;  // ← ajoute
    if (data.restaurant_id) {
      const { data: resto } = await supabase
        .from('restaurants')
        .select('name, logo_url, is_suspended')  // ← + is_suspended
        .eq('id', data.restaurant_id)
        .single();
      restaurantName = resto?.name ?? undefined;
      restaurantLogo = resto?.logo_url ?? null;
      restaurantSuspended = resto?.is_suspended ?? false;  // ← ajoute
    }

    return {
      role: data.role as UserRole,
      fullName: data.full_name,
      phone: data.phone ?? undefined,  // ← ajoute
      restaurantId: data.restaurant_id ?? null,   // ← ajoute
      restaurantName,   // ←
      restaurantLogo,   // ←
      restaurantSuspended,  // ← ajoute
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

      // Mémorise le resto pour personnaliser le prochain écran de login
      if (profile?.restaurantName) {
        try {
          localStorage.setItem('lastResto', JSON.stringify({
            name: profile.restaurantName,
            logo: profile.restaurantLogo ?? null,
          }));
        } catch { /* localStorage indisponible, on ignore */ }
      }

      return {
        user: s.user,
        role: profile?.role ?? 'cashier',
        fullName: profile?.fullName ?? s.user.email ?? 'Utilisateur',
        phone: profile?.phone ?? undefined,  // ← ajoute
        restaurantId: profile?.restaurantId ?? null,   // ← ajoute
        restaurantName: profile?.restaurantName ?? undefined,   // ← ajoute
        restaurantLogo: profile?.restaurantLogo ?? null,        // ← ajoute
        restaurantSuspended: profile?.restaurantSuspended ?? false,  // ← celui-ci est souvent oublié
        stationId: profile?.stationId ?? undefined,
        stationName: profile?.stationName ?? undefined,
        stationActive: profile?.stationActive ?? undefined,
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
      setTimeout(() => {
        void applySession(s).finally(() => setLoading(false));
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const signIn = useCallback(
    async (phone: string, password: string) => {
      const email = phoneToFakeEmail(phone);  // ← conversion ici
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