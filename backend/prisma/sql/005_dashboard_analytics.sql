-- ============================================================================
-- KerenTal Kita v1.3 - Dashboard Analytics Tables
-- ============================================================================
-- Migration untuk fitur dashboard analytics Super Admin
-- ============================================================================

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
-- Menyimpan notifikasi untuk Super Admin

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  -- Types: 'booking', 'approval', 'payment', 'system', 'user', 'commission'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- extra metadata (booking_id, instansi_id, etc.)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);

COMMENT ON TABLE notifications IS 'Notifikasi untuk Super Admin dashboard';
COMMENT ON COLUMN notifications.type IS 'Jenis notifikasi: booking, approval, payment, system, user, commission';
COMMENT ON COLUMN notifications.data IS 'Data tambahan dalam format JSON';

-- ============================================================================
-- TABLE: dashboard_activities
-- ============================================================================
-- Log aktivitas untuk timeline di dashboard

CREATE TABLE IF NOT EXISTS dashboard_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  -- Types: 'booking_confirmed', 'payment_received', 'instansi_registered',
  -- 'vehicle_approved', 'customer_registered', 'refund_processed',
  -- 'disbursement_sent', 'commission_collected'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB, -- extra data (amount, names, etc.)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS dashboard_activities_created_at_idx ON dashboard_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS dashboard_activities_type_idx ON dashboard_activities(type);

COMMENT ON TABLE dashboard_activities IS 'Log aktivitas untuk timeline dashboard Super Admin';
COMMENT ON COLUMN dashboard_activities.type IS 'Jenis aktivitas untuk filtering dan icons';

-- ============================================================================
-- INDEXES FOR ANALYTICS PERFORMANCE
-- ============================================================================

-- Bookings indexes for revenue/booking analytics
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings(created_at);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_total_harga_idx ON bookings(total_harga);

-- Disbursements indexes for commission analytics
CREATE INDEX IF NOT EXISTS disbursements_created_at_idx ON disbursements(created_at);
CREATE INDEX IF NOT EXISTS disbursements_status_idx ON disbursements(status);
CREATE INDEX IF NOT EXISTS disbursements_instansi_created_idx ON disbursements(instansi_id, created_at);

-- Instansi indexes for top companies ranking
CREATE INDEX IF NOT EXISTS instansi_status_idx ON instansi(status);
CREATE INDEX IF NOT EXISTS instansi_created_at_idx ON instansi(created_at);

-- ============================================================================
-- FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- Function to get revenue by period
CREATE OR REPLACE FUNCTION get_revenue_by_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(b.created_at) as date,
    SUM(b.total_harga) as total_revenue
  FROM bookings b
  WHERE b.created_at >= p_start_date
    AND b.created_at < p_end_date + INTERVAL '1 day'
    AND b.status NOT IN ('dibatalkan')
  GROUP BY DATE(b.created_at)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_revenue_by_period IS 'Get daily revenue for a date range';

-- Function to log dashboard activity
CREATE OR REPLACE FUNCTION log_dashboard_activity(
  p_type VARCHAR,
  p_title VARCHAR,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO dashboard_activities (type, title, description, metadata, created_by)
  VALUES (p_type, p_title, p_description, p_metadata, p_created_by)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_dashboard_activity IS 'Log an activity to dashboard_activities table';

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (type, title, message, data)
  VALUES (p_type, p_title, p_message, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_notification IS 'Create a notification for Super Admin';

-- ============================================================================
-- SEED INITIAL ACTIVITIES (optional - for demo purposes)
-- ============================================================================

-- Insert sample activities
INSERT INTO dashboard_activities (type, title, description, created_at) VALUES
  ('booking_confirmed', 'Booking Dikonfirmasi', 'Booking #BK001 telah dikonfirmasi', NOW() - INTERVAL '5 minutes'),
  ('payment_received', 'Pembayaran Diterima', 'Pembayaran Rp 850.000 untuk Booking #BK002', NOW() - INTERVAL '15 minutes'),
  ('instansi_registered', 'Instansi Baru Terdaftar', 'Rental Mobil Sejahtera mengajukan pendaftaran', NOW() - INTERVAL '1 hour'),
  ('vehicle_approved', 'Kendaraan Disetujui', 'Toyota Avanza disetujui untuk tayang', NOW() - INTERVAL '2 hours'),
  ('customer_registered', 'Pelanggan Baru', 'Andi Pratama mendaftar sebagai pelanggan', NOW() - INTERVAL '3 hours'),
  ('refund_processed', 'Refund Diproses', 'Refund Rp 500.000 untuk booking #BK089', NOW() - INTERVAL '5 hours')
ON CONFLICT DO NOTHING;

-- Insert sample notifications
INSERT INTO notifications (type, title, message, is_read, created_at) VALUES
  ('approval', 'Instansi Menunggu Verifikasi', 'Rental Mobil Sejahtera menunggu verifikasi dokumen', FALSE, NOW() - INTERVAL '30 minutes'),
  ('payment', 'Pembayaran Pending', '2 pembayaran belum dikonfirmasi', FALSE, NOW() - INTERVAL '1 hour'),
  ('booking', 'Booking Baru', '3 booking baru menunggu konfirmasi', FALSE, NOW() - INTERVAL '2 hours'),
  ('commission', 'Komisi Bulan Ini', 'Komisi bulan ini mencapai Rp 5.250.000', TRUE, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check new tables
SELECT 'notifications' as table_name, count(*) as row_count FROM notifications
UNION ALL
SELECT 'dashboard_activities', count(*) FROM dashboard_activities;

-- Check new indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('notifications', 'dashboard_activities', 'bookings', 'disbursements', 'instansi')
ORDER BY tablename, indexname;

-- Check functions
SELECT routine_name, data_type
FROM information_schema.routines
WHERE routine_name IN ('get_revenue_by_period', 'log_dashboard_activity', 'create_notification');

-- ============================================================================
