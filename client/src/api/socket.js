import { io } from 'socket.io-client';
import { API_URL } from './client.js';

export function createSocket(token) {
  const options = {
    auth: token ? { token } : {},
    autoConnect: true,
  };
  // No API_URL -> connect to the page's own origin; the Vite dev proxy
  // relays /socket.io (including websocket upgrades) to the backend.
  return API_URL ? io(API_URL, options) : io(options);
}
