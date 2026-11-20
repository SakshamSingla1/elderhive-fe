import { useMemo } from "react";
import { request } from ".";

const GEOCODING_URLS = {
  SEARCH: "/api/v1/geocoding/search",
};

// Mirrors com.elderhive.geocoding.GeocodingResult field-for-field.
export interface GeocodingResultDTO {
  displayName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const useGeocodingService = () => {
  return useMemo(
    () => ({
      search: (query: string) => request<GeocodingResultDTO[]>("GET", GEOCODING_URLS.SEARCH, null, { params: { query } }),
    }),
    []
  );
};
