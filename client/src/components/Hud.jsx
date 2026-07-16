import { UNIT_TYPES } from '../unitTypes.js';

export default function Hud({
  myNation,
  myUnits,
  selectedUnit,
  onBuyUnit,
  onSelectUnit,
  onLogout,
}) {
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

  return (
    <div className="hud">
      <div className="hud-header">
        <strong>{myNation.name}</strong>
        <button className="link" onClick={onLogout}>
          Déconnexion
        </button>
      </div>
      <div className="resources">
        <span>💰 {Math.floor(Number(myNation.money)).toLocaleString('fr-FR')}</span>
        <span className="income">+{myNation.incomeRate}/tick</span>
      </div>

      <div className="section">
        <h3>Unités</h3>
        {Object.entries(UNIT_TYPES).map(([type, spec]) => (
          <button
            key={type}
            onClick={() => onBuyUnit(type)}
            disabled={Number(myNation.money) < spec.cost}
          >
            Acheter {spec.label} ({spec.cost}💰)
          </button>
        ))}
      </div>

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
                {unit.type} #{unit.id} {unit.destLat ? '(en mouvement)' : ''}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
