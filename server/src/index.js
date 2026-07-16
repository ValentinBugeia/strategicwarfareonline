import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import { pool } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { nationsRouter } from './routes/nations.js';
import { unitsRouter } from './routes/units.js';
import { attachSocketHandlers } from './sockets/index.js';
import { startGameLoop } from './game/tick.js';

// Accept a comma-separated list of origins: the dev client is reachable as
// both http://localhost:5173 and http://127.0.0.1:5173, and locking CORS to
// a single spelling makes fetches from the other one fail confusingly.
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins },
});

app.set('io', io);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/nations', nationsRouter);
app.use('/api/units', unitsRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    // Surface the underlying cause during development so a missing table
    // or unreachable database is diagnosable from the browser alone.
    ...(process.env.NODE_ENV !== 'production' ? { detail: err.message } : {}),
  });
});

// Fail fast with an actionable message instead of letting every request
// 500 mysteriously when the database isn't ready.
async function assertDatabaseReady() {
  try {
    const { rows } = await pool.query('SELECT count(*)::int AS count FROM nations');
    if (rows[0].count === 0) {
      console.warn('WARNING: the nations table is empty - run `npm run seed` to import the world map.');
    }
  } catch (err) {
    if (err.code === '42P01') {
      console.error('Database tables are missing. Run `npm run migrate` then `npm run seed`, and restart.');
    } else {
      // AggregateError (e.g. connection refused on every resolved address)
      // has an empty .message - dig the real causes out of .errors.
      const detail =
        err.message || err.errors?.map((e) => e.message).join(' / ') || err.code || String(err);
      console.error(`Cannot query PostgreSQL via DATABASE_URL=${process.env.DATABASE_URL}`);
      console.error(`  -> ${detail}`);
      console.error('Is PostgreSQL running? Do the role and database from DATABASE_URL exist?');
      console.error('In a Codespace, run: bash .devcontainer/setup.sh');
    }
    process.exit(1);
  }
}

await assertDatabaseReady();
attachSocketHandlers(io);
startGameLoop(io);

const port = process.env.PORT ?? 4000;
httpServer.listen(port, () => {
  console.log(`Strategic Warfare Online server listening on :${port}`);
});
