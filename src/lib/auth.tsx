import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export type Role = 'student' | 'club_lead' | 'barista' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  birth_month: number | null;
  birth_day: number | null;
  total_meters: number;
  squad_id: string | null;
  club_lead_of: string | null;
}

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const client = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  const profileQuery = useQuery({
    queryKey: ['profile', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid!).single();
      if (error) throw error;
      return data as Profile;
    },
  });

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile: profileQuery.data ?? null,
      loading: !ready || (Boolean(uid) && profileQuery.isLoading),
      signOut: async () => {
        await supabase.auth.signOut();
        client.clear();
      },
    }),
    [session, profileQuery.data, profileQuery.isLoading, ready, uid, client],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be inside AuthProvider');
  return value;
}
