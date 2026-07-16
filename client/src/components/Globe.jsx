import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { ownerColorHsl } from '../utils/color.js';

const UNCLAIMED_COLOR = Cesium.Color.fromCssColorString('rgba(120,120,120,0.35)');
const worldGeoJson = feature(worldAtlas, worldAtlas.objects.countries);

export default function Globe({ nations, units, myNationId, selectedUnit, onSelectNation, onMoveTarget }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const countryEntitiesRef = useRef(new Map()); // isoCode -> entity
  const unitEntitiesRef = useRef(new Map()); // unitId -> entity
  const onSelectNationRef = useRef(onSelectNation);
  const onMoveTargetRef = useRef(onMoveTarget);
  const selectedUnitRef = useRef(selectedUnit);

  onSelectNationRef.current = onSelectNation;
  onMoveTargetRef.current = onMoveTarget;
  selectedUnitRef.current = selectedUnit;

  // Set up the viewer once.
  useEffect(() => {
    const viewer = new Cesium.Viewer(containerRef.current, {
      imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/',
      }),
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
      applyNationColors(countryEntitiesRef.current, nations, myNationId);
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);

      if (selectedUnitRef.current) {
        const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
        if (cartesian) {
          const carto = Cesium.Cartographic.fromCartesian(cartesian);
          onMoveTargetRef.current?.(
            Cesium.Math.toDegrees(carto.latitude),
            Cesium.Math.toDegrees(carto.longitude)
          );
        }
        return;
      }

      if (Cesium.defined(picked) && picked.id?.polygon) {
        const isoCode = String(picked.id.id).padStart(3, '0');
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
      const color = isMine ? Cesium.Color.CYAN : Cesium.Color.ORANGERED;
      const position = Cesium.Cartesian3.fromDegrees(unit.lon, unit.lat);
      let entity = unitEntitiesRef.current.get(unit.id);

      if (!entity) {
        entity = viewer.entities.add({
          position,
          point: { pixelSize: 10, color, outlineColor: Cesium.Color.WHITE, outlineWidth: 1 },
          label: {
            text: unit.type,
            font: '12px sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -16),
            fillColor: Cesium.Color.WHITE,
          },
        });
        unitEntitiesRef.current.set(unit.id, entity);
      } else {
        entity.position = position;
        entity.point.color = color;
      }

      entity.point.outlineColor =
        selectedUnit?.id === unit.id ? Cesium.Color.YELLOW : Cesium.Color.WHITE;
      entity.point.outlineWidth = selectedUnit?.id === unit.id ? 3 : 1;
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
