import { useCallback, useEffect, useMemo, useState } from 'react';
import Globe from './components/Globe.jsx';
import LoginForm from './components/LoginForm.jsx';
import Hud from './components/Hud.jsx';
import NationPanel from './components/NationPanel.jsx';
import IntelPanel from './components/IntelPanel.jsx';
import Scoreboard from './components/Scoreboard.jsx';
import CombatLog from './components/CombatLog.jsx';
import { apiFetch } from './api/client.js';
import { createSocket } from './api/socket.js';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('swo_token'));
  const [nations, setNations] = useState([]);
  const [myNation, setMyNation] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedIso, setSelectedIso] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [intelReports, setIntelReports] = useState(null); // null = panel closed
  const [combatEvents, setCombatEvents] = useState([]);

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
    // A building/unit finished, or a purchase happened: re-pull the full
    // economy snapshot (buildings, queue, unlocks) and the live map units.
    socket.on('economy:changed', () => {
      refreshMyNation(token);
      refreshUnits();
    });
    socket.on('nation:update', (patch) => {
      setMyNation((prev) => (prev ? { ...prev, ...patch } : prev));
    });
    // Combat losses: surface a toast (auto-dismissed after a few seconds).
    socket.on('combat:event', ({ lost }) => {
      const id = Date.now() + Math.random();
      const text = `Vous avez perdu ${lost} unité${lost > 1 ? 's' : ''} au combat`;
      setCombatEvents((prev) => [...prev.slice(-4), { id, text }]);
      setTimeout(() => setCombatEvents((prev) => prev.filter((e) => e.id !== id)), 6000);
    });
    return () => socket.disconnect();
  }, [token, refreshNations, refreshUnits, refreshMyNation]);

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
      await apiFetch(`/api/nations/${isoCode}/claim`, { method: 'POST', token });
      setSelectedIso(null);
      refreshMyNation(token); // full economy snapshot, not just the claim row
      refreshNations();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleBuyUnit(type) {
    try {
      await apiFetch('/api/units', { method: 'POST', token, body: { type } });
      refreshMyNation(token);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleBuild(type) {
    try {
      await apiFetch('/api/buildings', { method: 'POST', token, body: { type } });
      refreshMyNation(token);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleOpenIntel() {
    try {
      const reports = await apiFetch('/api/intel', { token });
      setIntelReports(reports);
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
          onBuild={handleBuild}
          onSelectUnit={setSelectedUnit}
          onOpenIntel={handleOpenIntel}
          onLogout={handleLogout}
        />
      )}

      {token && <Scoreboard nations={nations} myNationId={myNation?.id ?? null} />}

      {intelReports !== null && (
        <IntelPanel reports={intelReports} onClose={() => setIntelReports(null)} />
      )}

      <CombatLog events={combatEvents} />

      <NationPanel
        nation={selectedNation}
        canClaim={Boolean(token) && !myNation}
        onClaim={handleClaim}
        onClose={() => setSelectedIso(null)}
      />
    </div>
  );
}
