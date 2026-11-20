// Mirrors stripeClient.ts's own config-gating pattern. Blank -> isMapboxConfigured is
// false and molecules/ServiceRadiusMap renders its non-map fallback instead of crashing -
// the map is additive, the radius slider itself still works with zero Mapbox setup.
export const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

export const isMapboxConfigured = Boolean(mapboxAccessToken);
