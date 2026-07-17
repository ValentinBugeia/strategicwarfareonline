import { useEffect, useState } from 'react';
import { unitIconDataUri, OWN_UNIT_COLOR } from '../utils/unitIcons.js';
import { formatEta } from '../utils/format.js';
import {
  RESOURCE_META,
  RESOURCE_ORDER,
  BUILDINGS,
  UNIT_COSTS,
  formatCost,
  canAfford,
} from '../economy.js';

function UnitIcon({ type, size = 20 }) {
  return (
    <img src={unitIconDataUri(type, OWN_UNIT_COLOR)} width={size} height={size} alt="" className="unit-icon" />
  );
}

function secondsUntil(iso, now) {
  if (!iso) return null;
  return Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000));
}

export default function Hud({ myNation, myUnits, selectedUnit, onBuyUnit, onBuild, onSelectUnit, onLogout }) {
  // Local clock so construction / production ETAs count down every second
  // between server updates.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!myNation) {
    return (
      <div className="hud">
        <p>Cliquez sur un pays non revendiqué sur la carte pour prendre le contrôle d'une nation.</p>
        <button className="link" onClick={onLogout}>
          Déconnexion
        </button>
      </div>
    );
  }

  const rates = myNation.productionRates ?? {};
  const buildings = myNation.buildings ?? [];
  const queue = myNation.queue ?? [];
  const unlocked = myNation.unlockedUnits ?? [];

  return (
    <div className="hud">
      <div className="hud-header">
        <strong>{myNation.name}</strong>
        <button className="link" onClick={onLogout}>
          Déconnexion
        </button>
      </div>

      {/* Resource bar */}
      <div className="resource-bar">
        {RESOURCE_ORDER.map((r) => (
          <div key={r} className="resource" title={RESOURCE_META[r].label}>
            <span className="resource-amount">
              {RESOURCE_META[r].icon} {Math.floor(Number(myNation[r] ?? 0)).toLocaleString('fr-FR')}
            </span>
            {rates[r] != null && <span className="resource-rate">+{rates[r]}/tick</span>}
          </div>
        ))}
      </div>

      {/* Buildings */}
      <div className="section">
        <h3>Bâtiments</h3>
        {Object.entries(BUILDINGS).map(([type, spec]) => (
          <button
            key={type}
            className="build-button"
            onClick={() => onBuild(type)}
            disabled={!canAfford(myNation, spec.cost)}
            title={spec.effect}
          >
            <span className="build-icon">{spec.icon}</span>
            <span className="build-text">
              {spec.label}
              <span className="build-cost">{formatCost(spec.cost)}</span>
            </span>
          </button>
        ))}
        {buildings.length > 0 && (
          <ul className="building-list">
            {buildings.map((b) => {
              const eta = secondsUntil(b.completesAt, now);
              return (
                <li key={b.id}>
                  <span>
                    {BUILDINGS[b.type]?.icon} {BUILDINGS[b.type]?.label ?? b.type}
                  </span>
                  {b.status === 'active' ? (
                    <span className="badge-active">✅ actif</span>
                  ) : (
                    <span className="unit-eta">🏗 {formatEta(eta) ?? '…'}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Unit production */}
      <div className="section">
        <h3>Production d'unités</h3>
        {Object.entries(UNIT_COSTS).map(([type, spec]) => {
          const isUnlocked = unlocked.includes(type);
          const affordable = canAfford(myNation, spec.cost);
          return (
            <button
              key={type}
              className="buy-button"
              onClick={() => onBuyUnit(type)}
              disabled={!isUnlocked || !affordable}
              title={isUnlocked ? '' : `Nécessite : ${BUILDINGS[spec.requiresBuilding]?.label}`}
            >
              <UnitIcon type={type} />
              <span className="build-text">
                Infanterie
                <span className="build-cost">
                  {isUnlocked ? formatCost(spec.cost) : `🔒 ${BUILDINGS[spec.requiresBuilding]?.label} requise`}
                </span>
              </span>
            </button>
          );
        })}
        {queue.length > 0 && (
          <ul className="building-list">
            {queue.map((q) => (
              <li key={q.id}>
                <span>
                  <UnitIcon type={q.type} size={16} /> {UNIT_COSTS[q.type] ? 'Infanterie' : q.type}
                </span>
                <span className="unit-eta">🏭 {formatEta(secondsUntil(q.readyAt, now)) ?? '…'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Deployed units */}
      <div className="section">
        <h3>Mes unités ({myUnits.length})</h3>
        {selectedUnit && <p className="hint">Cliquez sur la carte pour déplacer l'unité sélectionnée.</p>}
        <ul className="unit-list">
          {myUnits.map((unit) => (
            <li key={unit.id}>
              <button
                className={selectedUnit?.id === unit.id ? 'selected' : ''}
                onClick={() => onSelectUnit(selectedUnit?.id === unit.id ? null : unit)}
              >
                <UnitIcon type={unit.type} />
                <span>
                  Infanterie #{unit.id}
                  {unit.destLat != null && (
                    <span className="unit-eta">⏱ arrive dans {formatEta(unit.etaSeconds) ?? '…'}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
