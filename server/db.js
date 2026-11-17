// Database (PostgreSQL) - inaunda majedwali yenyewe server inapowaka
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function q(text, params = []) {
  const r = await pool.query(text, params);
  return r.rows;
}
async function one(text, params = []) {
  const rows = await q(text, params);
  return rows[0] || null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'seller',
  account_type TEXT NOT NULL DEFAULT 'agent',
  name TEXT NOT NULL,
  business_name TEXT,
  slug TEXT UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  whatsapp TEXT,
  region TEXT,
  district TEXT,
  ward TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  service_areas TEXT,
  bio TEXT,
  avatar_id INTEGER,
  verify_level INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free',
  pro_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  otp_code TEXT,
  otp_expires TIMESTAMPTZ,
  otp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_ok BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER,
  data BYTEA NOT NULL,
  mime TEXT NOT NULL DEFAULT 'image/jpeg',
  private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  deal TEXT NOT NULL DEFAULT 'rent',
  price BIGINT NOT NULL DEFAULT 0,
  price_period TEXT NOT NULL DEFAULT 'month',
  advance_months INTEGER,
  negotiable BOOLEAN NOT NULL DEFAULT false,
  region TEXT,
  district TEXT,
  ward TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  bedrooms INTEGER,
  bathrooms INTEGER,
  size NUMERIC,
  size_unit TEXT,
  title_deed BOOLEAN,
  surveyed BOOLEAN,
  amenities JSONB NOT NULL DEFAULT '[]',
  agent_fee TEXT,
  viewing_fee TEXT,
  description TEXT,
  photos JSONB NOT NULL DEFAULT '[]',
  units_total INTEGER,
  units_available INTEGER,
  project_status TEXT,
  payment_plan TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  featured_until TIMESTAMPTZ,
  views INTEGER NOT NULL DEFAULT 0,
  leads_call INTEGER NOT NULL DEFAULT 0,
  leads_wa INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_user_idx ON listings(user_id);
CREATE INDEX IF NOT EXISTS listings_region_idx ON listings(region, district);

ALTER TABLE listings ADD COLUMN IF NOT EXISTS siteplan JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}';

-- Viwanja kwenye mchoro (site plan) wa tangazo la viwanja/mashamba/mradi
CREATE TABLE IF NOT EXISTS plots (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  size NUMERIC,
  price BIGINT,
  status TEXT NOT NULL DEFAULT 'available',
  points JSONB NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plots_listing_idx ON plots(listing_id);

CREATE TABLE IF NOT EXISTS verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nida TEXT,
  tin TEXT,
  id_image INTEGER,
  selfie_image INTEGER,
  license_image INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pro_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  months INTEGER NOT NULL DEFAULT 1,
  amount BIGINT NOT NULL DEFAULT 0,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  reporter_phone TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL,
  comment TEXT,
  name TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone)
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER,
  admin_name TEXT,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_logs_time_idx ON admin_logs(created_at);

CREATE TABLE IF NOT EXISTS agent_logs (
  id SERIAL PRIMARY KEY,
  session TEXT,
  question TEXT,
  reply TEXT,
  source TEXT,
  results INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_logs_time_idx ON agent_logs(created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

// Mipangilio ya mwanzo (admin anaweza kuibadilisha kwenye paneli)
const DEFAULT_SETTINGS = {
  free_limit: '5',
  pro_limit: '30',
  pro_price_month: '20000',
  featured_price_week: '10000',
  support_phone: '255785799530',
  support_email: 'info@hugotech.co.tz',
  review_mode: 'none',
  agent_enabled: '1',
  agent_ai_enabled: '1',
  agent_daily_limit: '20',
  agent_faq: '',
  pay_instructions:
    'Lipia kwa M-Pesa, Airtel Money au Mixx kwa namba utakayopewa na timu ya 88EST. Kisha weka namba ya muamala (reference) hapa chini, au tuma ujumbe WhatsApp +255785799530.',
};

async function init() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL haijawekwa kwenye Variables za Railway');
  }
  await pool.query(SCHEMA);
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await pool.query('INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [k, v]);
  }
  // Akaunti ya admin kutoka kwenye Variables
  const { normPhone } = require('./util');
  const { hashPassword } = require('./auth');
  const phone = normPhone(process.env.ADMIN_PHONE || '');
  const pw = process.env.ADMIN_PASSWORD;
  if (phone && pw) {
    const ex = await one('SELECT id FROM users WHERE phone = $1', [phone]);
    if (ex) {
      await pool.query("UPDATE users SET role = 'superadmin', password_hash = $1, status = 'active' WHERE id = $2", [hashPassword(pw), ex.id]);
    } else {
      await pool.query(
        "INSERT INTO users(role, account_type, name, phone, phone_verified, password_hash, slug) VALUES ('superadmin', 'agent', 'Super Admin 88EST', $1, true, $2, $3)",
        [phone, hashPassword(pw), 'admin-' + Date.now()]
      );
    }
    console.log('Akaunti ya super admin iko tayari: ' + phone);
  } else {
    console.log('ONYO: Weka ADMIN_PHONE na ADMIN_PASSWORD kwenye Variables ili kupata akaunti ya admin.');
  }
}

async function getSettings() {
  const rows = await q('SELECT key, value FROM settings');
  const s = { ...DEFAULT_SETTINGS };
  rows.forEach((r) => { s[r.key] = r.value; });
  return s;
}

module.exports = { pool, q, one, init, getSettings, DEFAULT_SETTINGS };
