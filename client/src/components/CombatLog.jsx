// Transient feed of combat events (unit losses). Fades old entries out; the
// list is capped by the parent.
export default function CombatLog({ events }) {
  if (events.length === 0) return null;
  return (
    <div className="combat-log">
      {events.map((e) => (
        <div key={e.id} className="combat-toast">
          ⚔️ {e.text}
        </div>
      ))}
    </div>
  );
}
