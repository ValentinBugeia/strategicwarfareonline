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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? '*' },
});

app.set('io', io);
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*' }));
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
