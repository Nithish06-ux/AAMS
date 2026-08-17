import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read DATABASE_URL or individual PG env variables
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${
    process.env.PGHOST || 'localhost'
  }:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'attendance_db'}`;

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 3000,
});

export const initPostgresDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL Database');

    // Load and run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);
      console.log('✓ Executed PostgreSQL Schema (11 tables initialized)');
    }

    client.release();
    return true;
  } catch (err) {
    console.log(`⚠️ PostgreSQL connection attempt: ${err.message}`);
    return false;
  }
};
