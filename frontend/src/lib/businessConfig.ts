/**
 * Info kontak bisnis terpusat — sebelumnya nomor WA di-hardcode terpisah
 * di KontakPage.tsx. Sekarang satu sumber, dipakai di semua tempat yang
 * butuh link WhatsApp (Kontak publik, "tanya soal pesanan ini" di detail
 * booking, dsb.) supaya tidak ada risiko lupa update salah satu saat
 * nomor bisnis asli berganti.
 *
 * GANTI nilai di bawah ini dengan data asli bisnis Anda.
 */
export const WHATSAPP_NUMBER = '6285834046354'; // format internasional tanpa "+" atau spasi
export const BUSINESS_EMAIL = 'admin@kerentalkita.id';
export const BUSINESS_PHONE_DISPLAY = '+62 858-3404-6354';

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}