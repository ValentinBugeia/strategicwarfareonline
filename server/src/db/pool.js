import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// An idle client hitting a connection error (e.g. the database restarting)
// emits 'error' on the pool; without a listener Node treats it as unhandled
// and crashes the whole server. Log it and let the pool recover instead.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error (will retry):', err.message);
});
