import 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * Diisi oleh middleware `verifySupabaseToken` setelah access_token
       * berhasil diverifikasi. `undefined` untuk endpoint publik yang
       * tidak melewati middleware ini.
       */
      user?: {
        id: string;
        email: string;
        role: 'customer' | 'admin';
      };
    }
  }
}
