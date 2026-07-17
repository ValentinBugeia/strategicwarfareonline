import { ownerColorHsl } from '../utils/color.js';

// Reinforces the "everyone on one shared server" feel: who controls which
// nation right now. Highlights the viewer's own nation.
export default function Scoreboard({ nations, myNationId }) {
  const owned = nations.filter((n) => n.ownerId).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="scoreboard">
      <h3>🌍 Puissances ({owned.length})</h3>
      {owned.length === 0 ? (
        <p className="hint">Aucune nation revendiquée pour l'instant.</p>
      ) : (
        <ul>
          {owned.map((n) => (
            <li key={n.id} className={n.id === myNationId ? 'me' : ''}>
              <span className="dot" style={{ background: ownerColorHsl(n.ownerId, 1) }} />
              {n.name}
              {n.id === myNationId && <span className="you"> (vous)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
