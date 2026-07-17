import { feature } from 'topojson-client';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import worldAtlas from 'world-atlas/countries-110m.json' with { type: 'json' };

// Country polygons keyed by the same padded ISO code the seed uses, so a
// map point can be resolved back to a nation row. Built once at import.
const world = feature(worldAtlas, worldAtlas.objects.countries);
const countries = world.features
  .filter((f) => f.id !== undefined)
  .map((f) => ({ isoCode: String(f.id).padStart(3, '0'), geometry: f }));

// ISO code of the country containing a lon/lat, or null if over open sea.
export function countryIsoAt(lon, lat) {
  const point = { type: 'Point', coordinates: [lon, lat] };
  for (const c of countries) {
    if (booleanPointInPolygon(point, c.geometry)) return c.isoCode;
  }
  return null;
}
