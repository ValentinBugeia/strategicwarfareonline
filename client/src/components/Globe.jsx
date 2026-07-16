import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { feature } from 'topojson-client';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import worldAtlas from 'world-atlas/countries-110m.json';
import { ownerColorHsl } from '../utils/color.js';
import { unitIconDataUri, OWN_UNIT_COLOR, ENEMY_UNIT_COLOR } from '../utils/unitIcons.js';

const UNCLAIMED_COLOR = Cesium.Color.fromCssColorString('rgba(170,170,170,0.30)');
const worldGeoJson = feature(worldAtlas, worldAtlas.objects.countries);

// Features without a numeric id (a few disputed territories) are also
// excluded from the seeded nations, so they're not claimable targets.
const countryFeatures = worldGeoJson.features.filter((f) => f.id !== undefined);

// Geometric hit-testing: resolve a clicked lat/lon to the country that
// contains it. GPU-based entity picking (scene.pick) proved unreliable
// across graphics stacks, while this is pure math and works everywhere.
function findCountryIsoAt(lon, lat) {
  const point = { type: 'Point', coordinates: [lon, lat] };
  for (const country of countryFeatures) {
    if (booleanPointInPolygon(point, country)) {
      return String(country.id).padStart(3, '0');
    }
  }
  return null;
}

export default function Globe({ nations, units, myNationId, selectedUnit, onSelectNation, onMoveTarget }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const countryEntitiesRef = useRef(new Map()); // isoCode -> entity
  const unitEntitiesRef = useRef(new Map()); // unitId -> entity
  const onSelectNationRef = useRef(onSelectNation);
  const onMoveTargetRef = useRef(onMoveTarget);
  const selectedUnitRef = useRef(selectedUnit);
  const nationsRef = useRef(nations);
  const myNationIdRef = useRef(myNationId);

  onSelectNationRef.current = onSelectNation;
  onMoveTargetRef.current = onMoveTarget;
  selectedUnitRef.current = selectedUnit;
  nationsRef.current = nations;
  myNationIdRef.current = myNationId;

  // Set up the viewer once.
  useEffect(() => {
    const viewer = new Cesium.Viewer(containerRef.current, {
      // `imageryProvider` was removed from the Viewer options in Cesium
      // 1.107+: it gets silently ignored and the viewer falls back to the
      // default ion imagery, which 404s without an access token and leaves
      // a bare blue globe. `baseLayer` is the current way to set imagery.
      // CARTO's label-free dark basemap keeps the strategic map readable:
      // full OSM street/city detail was visual noise at this scale.
      baseLayer: new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
          url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          credit: new Cesium.Credit('© OpenStreetMap contributors © CARTO'),
        })
      ),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: true,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
    });
    viewerRef.current = viewer;
    if (import.meta.env.DEV) {
      window.__cesiumViewer = viewer; // debugging aid, dev-only
      window.__Cesium = Cesium;
    }

    // Labels-only overlay on top of the clean basemap: transparent
    // everywhere except place names, so major cities/countries appear for
    // orientation without bringing back the street-level clutter. It sits
    // under the country fills (which are semi-transparent), so labels stay
    // readable through them.
    viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
      })
    );

    // No real terrain is loaded (flat ellipsoid), so draw polygons at a
    // fixed height instead of clampToGround: ground-clamped primitives
    // need WebGL features (depth textures / stencil) that silently fail
    // to render on some software-rendered / restricted GPUs.
    Cesium.GeoJsonDataSource.load(worldGeoJson, {
      stroke: Cesium.Color.BLACK.withAlpha(0.6),
      strokeWidth: 1,
      fill: UNCLAIMED_COLOR,
      clampToGround: false,
    }).then((dataSource) => {
      // React 18 StrictMode double-invokes this effect in dev, destroying
      // the first viewer before this async load resolves; bail out rather
      // than touch a destroyed viewer's now-undefined internals.
      if (viewer.isDestroyed()) return;
      viewer.dataSources.add(dataSource);
      for (const entity of dataSource.entities.values) {
        // Lift fills slightly off the ellipsoid surface: at height 0 they
        // z-fight with the globe itself (especially on software-rendered
        // WebGL), which made both the fill and picking silently fail.
        if (entity.polygon) {
          entity.polygon.height = 3000;
        }
        // GeoJsonDataSource sets entity.id from the feature's top-level
        // `id` (the numeric country code topojson-client attaches).
        const isoCode = String(entity.id).padStart(3, '0');
        countryEntitiesRef.current.set(isoCode, entity);
      }
      // Read ownership through refs: this async load can finish after the
      // nations fetch, and the mount-time `nations` prop is an empty array.
      applyNationColors(countryEntitiesRef.current, nationsRef.current, myNationIdRef.current);
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      // pickEllipsoid is a ray/ellipsoid intersection - unlike scene.pick
      // it needs no GPU readback, so it behaves identically everywhere.
      const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
      if (!cartesian) return; // clicked past the globe's edge
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lon = Cesium.Math.toDegrees(carto.longitude);

      if (selectedUnitRef.current) {
        onMoveTargetRef.current?.(lat, lon);
        return;
      }

      const isoCode = findCountryIsoAt(lon, lat);
      if (isoCode) {
        onSelectNationRef.current?.(isoCode);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-color countries whenever ownership changes.
  useEffect(() => {
    applyNationColors(countryEntitiesRef.current, nations, myNationId);
  }, [nations, myNationId]);

  // Sync unit entities with the latest positions.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const seen = new Set();

    for (const unit of units) {
      seen.add(unit.id);
      const isMine = unit.nationId === myNationId;
      const iconColor = isMine ? OWN_UNIT_COLOR : ENEMY_UNIT_COLOR;
      const position = Cesium.Cartesian3.fromDegrees(unit.lon, unit.lat);
      const isSelected = selectedUnit?.id === unit.id;
      let entity = unitEntitiesRef.current.get(unit.id);

      if (!entity) {
        entity = viewer.entities.add({
          position,
          billboard: {
            image: unitIconDataUri(unit.type, iconColor),
            width: 34,
            height: 34,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            // Keep icons a constant on-screen size instead of shrinking
            // into the globe as the camera pulls back.
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `${unit.type} #${unit.id}`,
            font: '600 12px system-ui, sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -24),
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            // Only clutter the map with a name for the selected unit.
            show: isSelected,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        unitEntitiesRef.current.set(unit.id, entity);
      } else {
        entity.position = position;
        entity.billboard.image = unitIconDataUri(unit.type, iconColor);
      }

      // A selected unit reads larger and reveals its label.
      entity.billboard.width = isSelected ? 44 : 34;
      entity.billboard.height = isSelected ? 44 : 34;
      entity.label.show = isSelected;
    }

    for (const [id, entity] of unitEntitiesRef.current.entries()) {
      if (!seen.has(id)) {
        viewer.entities.remove(entity);
        unitEntitiesRef.current.delete(id);
      }
    }
  }, [units, myNationId, selectedUnit]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}

function applyNationColors(entitiesByIso, nations, myNationId) {
  for (const nation of nations) {
    const entity = entitiesByIso.get(nation.isoCode);
    if (!entity?.polygon) continue;
    if (!nation.ownerId) {
      entity.polygon.material = UNCLAIMED_COLOR;
    } else {
      const alpha = nation.id === myNationId ? 0.75 : 0.5;
      entity.polygon.material = Cesium.Color.fromCssColorString(ownerColorHsl(nation.ownerId, alpha));
    }
  }
}
