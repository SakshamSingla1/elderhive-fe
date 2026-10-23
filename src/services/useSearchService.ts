import { useMemo } from "react";
import { request } from ".";
import type { CaretakerVerificationStatusEnum } from "../utils/enums";

const SEARCH_URLS = {
  CARETAKERS: "/api/v1/search/caretakers",
  ELDER_PROFILES: "/api/v1/search/elder-profiles",
};

/**
 * Mirrors com.elderhive.dtos.Search.CaretakerSearchResult field-for-field — deliberately
 * lighter than CaretakerProfileResponseDTO (useCaretakerService.ts), just enough for a
 * debounced autocomplete list item (Prompt 68's own design). Note the field is `name`,
 * not `fullName` like the full profile response.
 */
export interface CaretakerSearchResultDTO {
  id: number;
  // Added Prompt 92 - the caretaker's own user id, distinct from `id` above (their
  // CaretakerProfile's id) - lets a search result be matched against
  // usePresenceService's status map, which is keyed by user id.
  userId: number;
  name: string | null;
  specialtiesSummary: string | null;
  ratingAverage: number | null;
  distanceKm: number | null;
  verificationStatus: CaretakerVerificationStatusEnum;
}

export interface SearchCaretakersParams {
  query?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}

/**
 * Mirrors com.elderhive.dtos.Search.ElderProfileSearchResult field-for-field - scoped
 * server-side to elder profiles the CALLER can access (owner, co-manager, or the elder
 * themselves), never a global search (see that DTO's own javadoc) - `relationship`
 * describes how the caller relates to each result ("Owner", "Elder", or a FamilyElderLink
 * relationshipLabel).
 */
export interface ElderProfileSearchResultDTO {
  id: number;
  name: string | null;
  relationship: string | null;
}

export const useSearchService = () => {
  return useMemo(
    () => ({
      searchCaretakers: (params: SearchCaretakersParams) =>
        request<CaretakerSearchResultDTO[]>("GET", SEARCH_URLS.CARETAKERS, null, { params }),
      searchElderProfiles: (params: { query?: string; limit?: number }) =>
        request<ElderProfileSearchResultDTO[]>("GET", SEARCH_URLS.ELDER_PROFILES, null, { params }),
    }),
    []
  );
};
