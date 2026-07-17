import { RESOURCES } from './economy.js';

// Atomically debits a cost map {resource: amount} from a nation, but only if
// every stockpile covers its amount. Returns true on success, false if the
// nation can't afford it (in which case nothing is deducted). Must run inside
// a transaction; the conditional WHERE makes concurrent spends safe.
export async function debitResources(client, nationId, cost) {
  const columns = Object.keys(cost).filter((r) => RESOURCES.includes(r) && cost[r] > 0);
  if (columns.length === 0) return true;

  const setClause = columns.map((r, i) => `${r} = ${r} - $${i + 2}`).join(', ');
  const guardClause = columns.map((r, i) => `${r} >= $${i + 2}`).join(' AND ');
  const values = [nationId, ...columns.map((r) => cost[r])];

  const { rowCount } = await client.query(
    `UPDATE nations SET ${setClause} WHERE id = $1 AND ${guardClause}`,
    values
  );
  return rowCount > 0;
}
