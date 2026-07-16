import { useState } from 'react';
import { apiFetch } from '../api/client.js';

export default function LoginForm({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const data = await apiFetch(path, { method: 'POST', body: { email, password } });
      onAuth(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-panel">
      <h1>Strategic Warfare Online</h1>
      <p className="subtitle">Choisissez une nation. Le monde est partagé par tous.</p>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe (8+ caractères)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={busy}>
          {mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>
      <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter'}
      </button>
    </div>
  );
}
