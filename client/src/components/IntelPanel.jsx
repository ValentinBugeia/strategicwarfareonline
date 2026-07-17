import { RESOURCE_META, RESOURCE_ORDER, unitLabel } from '../economy.js';

// Espionage readout: what the player's infiltrated agents have uncovered
// about rival nations. Empty until a spy stands inside enemy territory.
export default function IntelPanel({ reports, onClose }) {
  return (
    <div className="intel-panel">
      <div className="panel-head">
        <h3>🕵️ Renseignement</h3>
        <button className="close" onClick={onClose}>
          ×
        </button>
      </div>
      {reports.length === 0 ? (
        <p className="hint">
          Envoyez un agent secret dans un pays ennemi pour révéler son économie et ses forces.
        </p>
      ) : (
        reports.map((r) => (
          <div key={r.isoCode} className="intel-report">
            <strong>{r.name}</strong>
            <div className="intel-resources">
              {RESOURCE_ORDER.map((res) => (
                <span key={res}>
                  {RESOURCE_META[res].icon} {Math.floor(Number(r.resources[res])).toLocaleString('fr-FR')}
                  <span className="resource-rate"> +{r.productionRates[res]}</span>
                </span>
              ))}
            </div>
            <div className="intel-units">
              {r.units.length === 0 ? (
                <span className="hint">Aucune unité détectée.</span>
              ) : (
                r.units.map((u) => (
                  <span key={u.type} className="intel-unit">
                    {unitLabel(u.type)} ×{u.count}
                  </span>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
