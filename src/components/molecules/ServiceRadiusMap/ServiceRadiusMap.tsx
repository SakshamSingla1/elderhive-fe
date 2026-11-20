import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Alert, Box, Slider, Stack, Typography } from "@mui/material";
import { isMapboxConfigured, mapboxAccessToken } from "../../../utils/mapboxClient";

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 100;
const EARTH_RADIUS_KM = 6371;
const RADIUS_SOURCE_ID = "service-radius";

export interface ServiceRadiusMapProps {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
}

/**
 * A 64-point polygon approximating a radiusKm circle around (centerLat, centerLng) - good
 * enough accuracy for a "how far will you travel" visualization at this radius range
 * (1-100km), without pulling in a full geo library (@turf/turf) for one formula.
 */
function circlePolygonCoordinates(centerLng: number, centerLat: number, radiusKm: number, points = 64): [number, number][] {
  const coords: [number, number][] = [];
  const latRad = (centerLat * Math.PI) / 180;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusKm / EARTH_RADIUS_KM) * Math.cos(angle);
    const dy = (radiusKm / EARTH_RADIUS_KM) * Math.sin(angle);
    const deltaLat = (dy * 180) / Math.PI;
    const deltaLng = ((dx * 180) / Math.PI) / Math.cos(latRad);
    coords.push([centerLng + deltaLng, centerLat + deltaLat]);
  }
  return coords;
}

function radiusFeature(longitude: number, latitude: number, radiusKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [circlePolygonCoordinates(longitude, latitude, radiusKm)] },
  };
}

/**
 * Prompt 105 - the map itself is config-gated exactly like the backend's geocoding
 * provider (VITE_MAPBOX_ACCESS_TOKEN absent -> a text/slider fallback, never a broken
 * page). The radius slider is NOT gated on that, deliberately - adjusting how far a
 * caretaker travels is core functionality, not a map-visualization nicety, so it stays
 * fully usable with zero Mapbox setup; only the visual pin+circle preview is additive.
 */
const ServiceRadiusMap: React.FC<ServiceRadiusMapProps> = ({ latitude, longitude, radiusKm, onRadiusChange }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const hasLocation = latitude != null && longitude != null;
  const showMap = isMapboxConfigured && hasLocation;

  useEffect(() => {
    if (!showMap || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxAccessToken as string;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [longitude as number, latitude as number],
      zoom: 11,
    });
    mapRef.current = map;
    markerRef.current = new mapboxgl.Marker({ color: "#1976d2" }).setLngLat([longitude as number, latitude as number]).addTo(map);

    map.on("load", () => {
      map.addSource(RADIUS_SOURCE_ID, { type: "geojson", data: radiusFeature(longitude as number, latitude as number, radiusKm) });
      map.addLayer({ id: "service-radius-fill", type: "fill", source: RADIUS_SOURCE_ID, paint: { "fill-color": "#1976d2", "fill-opacity": 0.15 } });
      map.addLayer({ id: "service-radius-outline", type: "line", source: RADIUS_SOURCE_ID, paint: { "line-color": "#1976d2", "line-width": 2 } });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only (re)creates the map when it first becomes showable - lat/long/radius changes
    // after that update the existing map's marker/source instead (the effect below), so
    // the map instance itself isn't torn down and rebuilt on every slider tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasLocation) return;
    markerRef.current?.setLngLat([longitude as number, latitude as number]);
    const source = map.getSource(RADIUS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(radiusFeature(longitude as number, latitude as number, radiusKm));
  }, [latitude, longitude, radiusKm, hasLocation]);

  return (
    <Stack spacing={1.5}>
      {showMap ? (
        <Box ref={containerRef} data-testid="service-radius-map-canvas" sx={{ width: "100%", height: 280, borderRadius: 1, overflow: "hidden" }} />
      ) : (
        <Alert severity="info">
          {hasLocation ? "Map preview unavailable - no map provider configured." : "Set your service location above to preview it on a map."}
        </Alert>
      )}
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2" sx={{ minWidth: 150 }}>
          Service radius: {radiusKm} km
        </Typography>
        <Slider
          value={radiusKm}
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
          step={1}
          onChange={(_e, value) => onRadiusChange(Array.isArray(value) ? value[0] : value)}
          valueLabelDisplay="auto"
          aria-label="Service radius in kilometers"
        />
      </Stack>
    </Stack>
  );
};

export default ServiceRadiusMap;
