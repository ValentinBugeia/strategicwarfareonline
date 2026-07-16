// Empty by default: requests go to the same origin as the page and the
// Vite dev proxy (see vite.config.js) forwards them to the backend. Set
// VITE_API_URL only when the API lives on a different origin in production.
const API_URL = import.meta.env.VITE_API_URL ?? '';

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error ?? `Request failed: ${res.status}`;
    // In development the server attaches the underlying cause (e.g. a
    // missing table) - surface it so setup problems are visible in the UI.
    throw new Error(data?.detail ? `${message} — ${data.detail}` : message);
  }
  return data;
}

export { API_URL };
