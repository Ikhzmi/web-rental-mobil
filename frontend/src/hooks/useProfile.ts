import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSession } from './useSession';

/**
 * Ambil data profil (termasuk `role`) dari backend — dipakai untuk
 * membedakan tampilan customer vs admin. `useSession()` cuma tahu "sudah
 * login atau belum" (dari Supabase Auth JWT), sedangkan `role` itu kolom
 * di tabel `profiles`, jadi perlu request terpisah ke
 * `GET /api/profiles/me`.
 *
 * `enabled: !!session` — jangan fetch profil kalau belum ada sesi sama
 * sekali (hindari request 401 yang percuma).
 */
export function useProfile() {
  const { session, loading: sessionLoading } = useSession();

  const query = useQuery({
    queryKey: ['my-profile', session?.user.id],
    queryFn: api.getMyProfile,
    enabled: !!session,
    staleTime: 60_000,
  });

  return {
    profile: query.data,
    isAdmin: query.data?.role === 'admin',
    loading: sessionLoading || (!!session && query.isLoading),
  };
}