import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

export const authRouter = Router();

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Email and a password of at least 8 characters are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [normalizedEmail, passwordHash]
  );
  const user = rows[0];
  res.status(201).json({ token: signToken(user), user });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [
    normalizedEmail,
  ]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
});
