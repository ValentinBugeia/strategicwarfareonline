import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Applies schema.sql. It is written entirely with IF NOT EXISTS / ADD COLUMN
// IF NOT EXISTS, so running it repeatedly is safe and idempotent - which lets
// the server apply it automatically on every startup.
export async function applySchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

// Allow `npm run migrate` to run it as a standalone script too.
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  applySchema()
    .then(() => {
      console.log('Migration applied.');
      return pool.end();
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
