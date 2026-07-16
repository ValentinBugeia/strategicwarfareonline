import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

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
  res.status(500).json({ error: 'Internal server error' });
});

attachSocketHandlers(io);
startGameLoop(io);

const port = process.env.PORT ?? 4000;
httpServer.listen(port, () => {
  console.log(`Strategic Warfare Online server listening on :${port}`);
});
