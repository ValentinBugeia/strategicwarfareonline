const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

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
