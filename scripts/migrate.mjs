// Applies supabase/migrations/*.sql in order. Tracks applied files in schema_migrations.
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing in .env.local');
  process.exit(1);
}

const dir = 'supabase/migrations';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query('create schema if not exists private');
await client.query('create table if not exists private.schema_migrations (name text primary key, applied_at timestamptz default now())');

const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
for (const file of files) {
  const { rowCount } = await client.query('select 1 from private.schema_migrations where name = $1', [file]);
  if (rowCount) continue;
  const sql = await fs.readFile(path.join(dir, file), 'utf8');
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into private.schema_migrations (name) values ($1)', [file]);
    await client.query('commit');
    console.log('applied', file);
  } catch (err) {
    await client.query('rollback');
    console.error('FAILED', file, '-', err.message, err.position ? `(pos ${err.position})` : '');
    process.exit(1);
  }
}
await client.end();
console.log('migrations up to date');
