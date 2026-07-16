import jwt from 'jsonwebtoken';

// Sockets identify their user via the JWT issued at login (same token used
// for the REST API) and join a private per-user room so tick updates about
// a nation's treasury only ever reach that nation's own player.
export function attachSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // anonymous viewers can still watch the shared map
    try {
      socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // ignore invalid token, treat as anonymous
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.data.user) {
      socket.join(`user:${socket.data.user.id}`);
    }
  });
}
