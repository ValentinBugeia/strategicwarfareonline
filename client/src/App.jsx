import { useCallback, useEffect, useMemo, useState } from 'react';
import Globe from './components/Globe.jsx';
import LoginForm from './components/LoginForm.jsx';
import Hud from './components/Hud.jsx';
import NationPanel from './components/NationPanel.jsx';
import { apiFetch } from './api/client.js';
import { createSocket } from './api/socket.js';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('swo_token'));
  const [nations, setNations] = useState([]);
  const [myNation, setMyNation] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedIso, setSelectedIso] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const refreshNations = useCallback(() => {
    apiFetch('/api/nations').then(setNations).catch(console.error);
  }, []);

  const refreshMyNation = useCallback((authToken) => {
    if (!authToken) {
      setMyNation(null);
      return;
    }
    apiFetch('/api/nations/me', { token: authToken }).then(setMyNation).catch(console.error);
  }, []);

  const refreshUnits = useCallback(() => {
    apiFetch('/api/units').then(setUnits).catch(console.error);
  }, []);

  // Initial + on-login data load.
  useEffect(() => {
    refreshNations();
    refreshUnits();
  }, [refreshNations, refreshUnits]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__debugSelectNation = setSelectedIso; // debugging aid, dev-only
      window.__debugSelectUnit = setSelectedUnit;
    }
  }, []);

  useEffect(() => {
    refreshMyNation(token);
  }, [token, refreshMyNation]);

  // Realtime sync.
  useEffect(() => {
    const socket = createSocket(token);
    socket.on('nations:changed', refreshNations);
    socket.on('units:changed', refreshUnits);
    socket.on('units:update', setUnits);
    socket.on('nation:update', (patch) => {
      setMyNation((prev) => (prev ? { ...prev, ...patch } : prev));
    });
    return () => socket.disconnect();
  }, [token, refreshNations, refreshUnits]);

  function handleAuth(newToken, _user) {
    localStorage.setItem('swo_token', newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem('swo_token');
    setToken(null);
    setMyNation(null);
    setSelectedUnit(null);
  }

  async function handleClaim(isoCode) {
    try {
      const nation = await apiFetch(`/api/nations/${isoCode}/claim`, { method: 'POST', token });
      setMyNation(nation);
      setSelectedIso(null);
      refreshNations();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleBuyUnit(type) {
    try {
      await apiFetch('/api/units', { method: 'POST', token, body: { type } });
      refreshMyNation(token);
      refreshUnits();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleMoveTarget(lat, lon) {
    if (!selectedUnit) return;
    try {
      const updated = await apiFetch(`/api/units/${selectedUnit.id}/move`, {
        method: 'POST',
        token,
        body: { lat, lon },
      });
      setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSelectedUnit(null);
    } catch (err) {
      alert(err.message);
    }
  }

  const myUnits = useMemo(
    () => (myNation ? units.filter((u) => u.nationId === myNation.id) : []),
    [units, myNation]
  );

  const selectedNation = useMemo(
    () => nations.find((n) => n.isoCode === selectedIso) ?? null,
    [nations, selectedIso]
  );

  return (
    <div className="app">
      <Globe
        nations={nations}
        units={units}
        myNationId={myNation?.id ?? null}
        selectedUnit={selectedUnit}
        onSelectNation={setSelectedIso}
        onMoveTarget={handleMoveTarget}
      />

      {!token && (
        <div className="overlay-center">
          <LoginForm onAuth={handleAuth} />
        </div>
      )}

      {token && (
        <Hud
          myNation={myNation}
          myUnits={myUnits}
          selectedUnit={selectedUnit}
          onBuyUnit={handleBuyUnit}
          onSelectUnit={setSelectedUnit}
          onLogout={handleLogout}
        />
      )}

      <NationPanel
        nation={selectedNation}
        canClaim={Boolean(token) && !myNation}
        onClaim={handleClaim}
        onClose={() => setSelectedIso(null)}
      />
    </div>
  );
}
