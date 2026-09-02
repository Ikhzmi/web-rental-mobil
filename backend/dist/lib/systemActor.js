"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemActorId = getSystemActorId;
const prisma_1 = require("./prisma");
/**
 * Cari satu akun super_admin untuk dipakai sebagai "pelaku" di kolom
 * `diubahOleh` pada BookingStatusLog saat perubahan status dilakukan
 * otomatis oleh sistem (bukan oleh admin/customer yang login) — misalnya
 * webhook pembayaran atau job auto-expire booking basi.
 *
 * PENTING: `diubahOleh` adalah foreign key WAJIB ke tabel Profile (UUID),
 * BUKAN kolom teks bebas — jadi tidak bisa diisi string seperti 'system'.
 * Sebelumnya ini ditulis `diubahOleh: 'system'` di beberapa tempat
 * (webhook pembayaran & job auto-expire), yang selalu gagal karena
 * melanggar foreign key constraint dan menggagalkan (rollback) SELURUH
 * transaksi yang membungkusnya — termasuk perubahan status booking yang
 * sebenarnya, bukan cuma baris log-nya.
 *
 * Hasil pencarian di-cache di memory (module-level) supaya tidak query
 * berulang setiap kali dipanggil.
 */
let cachedSystemActorId; // undefined = belum pernah dicari
async function getSystemActorId() {
    if (cachedSystemActorId !== undefined)
        return cachedSystemActorId;
    const superAdmin = await prisma_1.prisma.profile.findFirst({
        where: { role: 'super_admin' },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
    });
    const resolvedId = superAdmin ? superAdmin.id : null;
    cachedSystemActorId = resolvedId;
    if (!cachedSystemActorId) {
        console.warn('[systemActor] Tidak ada akun super_admin ditemukan — perubahan status otomatis ' +
            'oleh sistem (webhook pembayaran, auto-expire booking) akan tetap dijalankan, tapi ' +
            'TANPA entri riwayat di BookingStatusLog (kolom diubahOleh wajib UUID valid). Buat ' +
            'minimal satu akun super_admin supaya riwayat tercatat lengkap.');
    }
    return cachedSystemActorId;
}
//# sourceMappingURL=systemActor.js.map