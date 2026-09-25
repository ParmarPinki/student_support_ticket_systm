import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not configured. Set it in server/.env before starting the API.');
}

const databaseUrl = process.env.DATABASE_URL || '';
const needsSsl =
  process.env.NODE_ENV === 'production' ||
  databaseUrl.includes('sslmode=require') ||
  databaseUrl.includes('neon.tech') ||
  databaseUrl.includes('supabase.com');

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}
