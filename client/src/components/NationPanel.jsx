export default function NationPanel({ nation, canClaim, onClaim, onClose }) {
  if (!nation) return null;

  return (
    <div className="nation-panel">
      <button className="close" onClick={onClose}>
        ×
      </button>
      <h3>{nation.name}</h3>
      <p>{nation.ownerId ? `Contrôlée par le joueur #${nation.ownerId}` : 'Non revendiquée'}</p>
      {!nation.ownerId && canClaim && <button onClick={() => onClaim(nation.isoCode)}>Revendiquer cette nation</button>}
      {!nation.ownerId && !canClaim && <p className="hint">Vous contrôlez déjà une nation.</p>}
    </div>
  );
}
