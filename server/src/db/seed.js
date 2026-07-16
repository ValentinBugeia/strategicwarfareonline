// Seeds the `nations` table from world-atlas's Natural Earth country
// boundaries (110m resolution). Each country becomes a claimable nation,
// starting unowned, with a starting treasury and its polygon centroid as
// the spawn point for that nation's first units.
import { feature } from 'topojson-client';
import * as turf from '@turf/turf';
import worldAtlas from 'world-atlas/countries-110m.json' with { type: 'json' };
import { pool } from './pool.js';

const STARTING_MONEY = 5000;
const STARTING_INCOME = 50;

// Countries with overseas territories (France, USA, Russia, Netherlands...)
// are MultiPolygons whose combined centroid can land in open ocean between
// the parts. Use the centroid of the largest landmass instead so the spawn
// point always falls on the country's mainland.
function mainlandCentroid(feature) {
  if (feature.geometry.type !== 'MultiPolygon') {
    return turf.centroid(feature).geometry.coordinates;
  }
  const polygons = turf.flatten(feature).features;
  const largest = polygons.reduce((biggest, poly) =>
    turf.area(poly) > turf.area(biggest) ? poly : biggest
  );
  return turf.centroid(largest).geometry.coordinates;
}

async function seed() {
  const geo = feature(worldAtlas, worldAtlas.objects.countries);

  const rows = geo.features
    // A handful of disputed/unrecognized territories (Kosovo, Somaliland,
    // Northern Cyprus) have no numeric id in this dataset; without one
    // they'd all collide on the same iso_code and clobber each other.
    // Skip them for now rather than seed a broken/shared nation row.
    .filter((f) => f.properties?.name && f.properties.name !== 'Antarctica' && f.id !== undefined)
    .map((f) => {
      const centroid = mainlandCentroid(f); // [lon, lat]
      return {
        isoCode: String(f.id).padStart(3, '0'),
        name: f.properties.name,
        lat: centroid[1],
        lon: centroid[0],
      };
    });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const nation of rows) {
      await client.query(
        `INSERT INTO nations (iso_code, name, centroid_lat, centroid_lon, money, income_rate)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (iso_code) DO UPDATE SET
           name = EXCLUDED.name,
           centroid_lat = EXCLUDED.centroid_lat,
           centroid_lon = EXCLUDED.centroid_lon`,
        [nation.isoCode, nation.name, nation.lat, nation.lon, STARTING_MONEY, STARTING_INCOME]
      );
    }
    await client.query('COMMIT');
    console.log(`Seeded ${rows.length} nations.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
