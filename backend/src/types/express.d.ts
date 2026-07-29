import 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * Diisi oleh middleware `verifySupabaseToken` setelah access_token
       * berhasil diverifikasi. `undefined` untuk endpoint publik yang
       * tidak melewati middleware ini.
       *
       * Updated v1.3:
       * - role: tambah 'super_admin'
       * - instansiId: untuk admin, null untuk customer/super_admin
       */
      user?: {
        id: string;
        email: string;
        role: 'customer' | 'admin' | 'super_admin';
        /** ID instansi yang terikat dengan admin ini. Null untuk customer dan super_admin. */
        instansiId?: string;
      };

      /**
       * Scoping filter untuk query multi-tenancy.
       * Diisi oleh middleware `scopeToInstansi`.
       * Berisi { instansiId: string } untuk admin, undefined untuk super_admin.
       */
      instansiScope?: {
        instansiId: string;
      };
    }
  }
}
