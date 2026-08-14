// Mock data for dashboard toggle

interface MockDashboardData {
  totalInstansiAktif: number;
  totalInstansiMenunggu: number;
  totalUsers: number;
  totalMobil: number;
  mobilMenungguApproval: number;
  totalPendapatanPlatform: number;
  totalKomisiTerkumpul: number;
  bookingStats: Record<string, number>;
}

interface MockDashboardTrendData {
  trendInstansi: number;
  trendUsers: number;
  trendArmada: number;
  trendKomisi: number;
  sparklineInstansi: number[];
  sparklineUsers: number[];
  sparklineArmada: number[];
  sparklineKomisi: number[];
}

export const MOCK_DASHBOARD_DATA: MockDashboardData = {
  totalInstansiAktif: 24,
  totalInstansiMenunggu: 3,
  totalUsers: 1542,
  totalMobil: 89,
  mobilMenungguApproval: 5,
  totalPendapatanPlatform: 45000000,
  totalKomisiTerkumpul: 12500000,
  bookingStats: {
    menunggu_pembayaran: 12,
    dikonfirmasi: 28,
    berjalan: 15,
    selesai: 156,
    dibatalkan: 8,
  },
};

export const MOCK_TREND_DATA: MockDashboardTrendData = {
  trendInstansi: 12.5,
  trendUsers: 8.3,
  trendArmada: 15.2,
  trendKomisi: 22.7,
  sparklineInstansi: [2, 4, 6, 3, 5, 7, 8, 6, 9, 12, 10, 14],
  sparklineUsers: [120, 135, 142, 158, 165, 178, 190, 195, 210, 225, 235, 250],
  sparklineArmada: [45, 52, 58, 62, 68, 72, 75, 78, 82, 85, 87, 89],
  sparklineKomisi: [500, 650, 780, 890, 950, 1050, 1150, 1200, 1180, 1220, 1240, 1250],
};

export interface MockActivity {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string;
}

export const MOCK_ACTIVITIES: MockActivity[] = [
  {
    id: '1',
    type: 'booking_completed',
    title: 'Booking Selesai',
    description: 'Honda City - Ahmad Wijaya',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'payment_received',
    title: 'Pembayaran Diterima',
    description: 'Rp 850.000 dari Rental Sejahtera',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'vehicle_approved',
    title: 'Mobil Disetujui',
    description: 'Toyota Avanza - Rental Berkah',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'instansi_registered',
    title: 'Instansi Baru',
    description: 'Rental Mobil Jaya terdaftar',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    type: 'customer_registered',
    title: 'Customer Baru',
    description: 'Dewi Lestari mendaftar',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

export interface MockApprovalItem {
  id: string;
  car: {
    nama: string;
    kategori: string;
    transmisi: string;
    kapasitasKursi: number;
    tipeSewa: string;
    hargaPerHari: number;
    images: Array<{ url: string }>;
    instansi: { namaInstansi: string };
  };
}

export const MOCK_APPROVAL_ITEMS: MockApprovalItem[] = [
  {
    id: '1',
    car: {
      nama: 'Toyota Camry 2023',
      kategori: 'mewah',
      transmisi: 'matic',
      kapasitasKursi: 4,
      tipeSewa: 'dengan_sopir',
      hargaPerHari: 1500000,
      images: [{ url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400' }],
      instansi: { namaInstansi: 'Rental Mewah Jakarta' },
    },
  },
  {
    id: '2',
    car: {
      nama: 'Honda HR-V 2024',
      kategori: 'suv',
      transmisi: 'matic',
      kapasitasKursi: 5,
      tipeSewa: 'tanpa_sopir',
      hargaPerHari: 650000,
      images: [{ url: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=400' }],
      instansi: { namaInstansi: 'Rental Berkah' },
    },
  },
];

export interface MockTodayBooking {
  id: string;
  car: { nama: string };
  profile: { nama: string };
  tanggalMulai: string;
  tanggalSelesai: string;
  totalHarga: number;
  status: string;
}

export const MOCK_TODAY_BOOKINGS: MockTodayBooking[] = [
  {
    id: '1',
    car: { nama: 'Toyota Avanza' },
    profile: { nama: 'Ahmad Wijaya' },
    tanggalMulai: new Date().toISOString(),
    tanggalSelesai: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    totalHarga: 850000,
    status: 'dikonfirmasi',
  },
  {
    id: '2',
    car: { nama: 'Honda City' },
    profile: { nama: 'Dewi Lestari' },
    tanggalMulai: new Date().toISOString(),
    tanggalSelesai: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    totalHarga: 650000,
    status: 'berjalan',
  },
  {
    id: '3',
    car: { nama: 'Suzuki Ertiga' },
    profile: { nama: 'Budi Santoso' },
    tanggalMulai: new Date().toISOString(),
    tanggalSelesai: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    totalHarga: 750000,
    status: 'menunggu_pembayaran',
  },
];

export interface MockTopCompany {
  id: string;
  namaInstansi: string;
  totalBooking: number;
  revenue: number;
}

export const MOCK_TOP_COMPANIES: MockTopCompany[] = [
  { id: '1', namaInstansi: 'Rental Sejahtera', totalBooking: 45, revenue: 125000000 },
  { id: '2', namaInstansi: 'Rental Berkah', totalBooking: 38, revenue: 98000000 },
  { id: '3', namaInstansi: 'Rental Jaya', totalBooking: 32, revenue: 85000000 },
];

export interface MockPopularVehicle {
  id: string;
  nama: string;
  kategori: string;
  totalBooking: number;
  rating: number;
}

export const MOCK_POPULAR_VEHICLES: MockPopularVehicle[] = [
  { id: '1', nama: 'Toyota Avanza', kategori: 'MPV', totalBooking: 89, rating: 4.8 },
  { id: '2', nama: 'Honda City', kategori: 'Sedan', totalBooking: 72, rating: 4.7 },
  { id: '3', nama: 'Suzuki Ertiga', kategori: 'MPV', totalBooking: 65, rating: 4.6 },
];

// Mock Analytics Data
export const MOCK_ANALYTICS_DATA = {
  totalRevenue: 45000000,
  revenueData: [
    { date: '2024-01-01', revenue: 1200000 },
    { date: '2024-01-02', revenue: 1800000 },
    { date: '2024-01-03', revenue: 1500000 },
    { date: '2024-01-04', revenue: 2200000 },
    { date: '2024-01-05', revenue: 1900000 },
    { date: '2024-01-06', revenue: 2500000 },
    { date: '2024-01-07', revenue: 2100000 },
    { date: '2024-01-08', revenue: 1700000 },
    { date: '2024-01-09', revenue: 2300000 },
    { date: '2024-01-10', revenue: 2800000 },
    { date: '2024-01-11', revenue: 2400000 },
    { date: '2024-01-12', revenue: 2600000 },
    { date: '2024-01-13', revenue: 3000000 },
    { date: '2024-01-14', revenue: 2700000 },
    { date: '2024-01-15', revenue: 2900000 },
    { date: '2024-01-16', revenue: 3200000 },
    { date: '2024-01-17', revenue: 2800000 },
    { date: '2024-01-18', revenue: 2500000 },
    { date: '2024-01-19', revenue: 3000000 },
    { date: '2024-01-20', revenue: 3500000 },
    { date: '2024-01-21', revenue: 3100000 },
    { date: '2024-01-22', revenue: 2800000 },
    { date: '2024-01-23', revenue: 3200000 },
    { date: '2024-01-24', revenue: 3600000 },
    { date: '2024-01-25', revenue: 3300000 },
    { date: '2024-01-26', revenue: 3000000 },
    { date: '2024-01-27', revenue: 3400000 },
    { date: '2024-01-28', revenue: 3800000 },
    { date: '2024-01-29', revenue: 3500000 },
    { date: '2024-01-30', revenue: 3200000 },
  ],
};

export const MOCK_BOOKING_STATUS_DATA = [
  { status: 'Menunggu Bayar', count: 12 },
  { status: 'Dikonfirmasi', count: 28 },
  { status: 'Berjalan', count: 15 },
  { status: 'Selesai', count: 156 },
  { status: 'Dibatalkan', count: 8 },
];
