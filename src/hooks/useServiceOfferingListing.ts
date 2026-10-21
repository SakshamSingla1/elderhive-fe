import { useEffect, useState } from "react";
import { useServiceOfferingService } from "../services/useServiceOfferingService";
import type { ServiceOfferingResponse } from "../services/useServiceOfferingService";
import type { ServiceOfferingStatusEnum } from "../utils/enums";
import { getErrorMessage } from "../utils/helper";

const DEFAULT_PAGE_SIZE = 9;

export interface UseServiceOfferingListingResult {
  serviceOfferings: ServiceOfferingResponse[];
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  categoryId: number | null;
  setCategoryId: (categoryId: number | null) => void;
  isLoading: boolean;
  loadError: string | null;
  /** Re-fetches the current page - e.g. after a successful delete. */
  refetch: () => void;
}

/**
 * Fetches one page of the service-offering catalog, filtered by an optional category, and
 * owns its pagination/filter state - shared by the admin Services.page.tsx (full CRUD
 * surface) and the family-facing BrowseServices.page.tsx (read-only, Prompt 74), which need
 * identical data-fetching but render ServiceOfferingListingTemplate with a different
 * allowMutations value around it, matching useColorThemeListing.ts's own split with
 * AccountSettings.page.tsx.
 *
 * <p>statusFilter is fixed at construction time (not exposed as state) - the family browse
 * view always wants ACTIVE-only, while the admin catalog wants every status, so each
 * caller passes its own fixed value rather than this hook owning a mutable status filter
 * neither caller actually needs to change at runtime.
 */
export function useServiceOfferingListing(
  statusFilter?: ServiceOfferingStatusEnum,
  pageSize: number = DEFAULT_PAGE_SIZE
): UseServiceOfferingListingResult {
  const serviceOfferingService = useServiceOfferingService();
  const [page, setPage] = useState(0);
  const [categoryId, setCategoryIdState] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [serviceOfferings, setServiceOfferings] = useState<ServiceOfferingResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const setCategoryId = (newCategoryId: number | null) => {
    setCategoryIdState(newCategoryId);
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    serviceOfferingService
      .getServiceOfferings({ page, size: pageSize, categoryId: categoryId ?? undefined, status: statusFilter })
      .then((result) => {
        if (cancelled) return;
        setServiceOfferings(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, "Could not load service offerings."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, categoryId, statusFilter, refreshToken]);

  return {
    serviceOfferings,
    page,
    setPage,
    totalPages,
    categoryId,
    setCategoryId,
    isLoading,
    loadError,
    refetch: () => setRefreshToken((t) => t + 1),
  };
}
