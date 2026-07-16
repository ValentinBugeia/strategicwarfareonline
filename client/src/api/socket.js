import { io } from 'socket.io-client';
import { API_URL } from './client.js';

export function createSocket(token) {
  return io(API_URL, {
    auth: token ? { token } : {},
    autoConnect: true,
  });
}
