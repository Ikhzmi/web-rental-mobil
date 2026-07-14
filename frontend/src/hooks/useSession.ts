import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UseSessionResult {
  session: Session | null;
  loading: boolean;
}

/**
 * Membaca sesi Supabase saat ini + berlangganan perubahan (login/logout
 * di tab lain, token refresh, dll). Dipakai RequireAuth dan halaman mana
 * pun yang perlu tahu status login tanpa menulis ulang boilerplate ini.
 */
export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
