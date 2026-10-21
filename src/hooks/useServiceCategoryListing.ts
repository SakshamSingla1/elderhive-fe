import { useEffect, useState } from "react";
import { useServiceCategoryService } from "../services/useServiceCategoryService";
import type { ServiceCategoryResponse } from "../services/useServiceCategoryService";
import { getErrorMessage } from "../utils/helper";

const DEFAULT_PAGE_SIZE = 9;

export interface UseServiceCategoryListingResult {
  serviceCategories: ServiceCategoryResponse[];
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  isLoading: boolean;
  loadError: string | null;
  /** Re-fetches the current page - e.g. after a successful delete. */
  refetch: () => void;
}

/**
 * Fetches one page of the service-category catalog and owns its pagination state - shared
 * by the admin ServiceCategories.page.tsx (full CRUD surface, Prompt 74). Matches
 * useColorThemeListing.ts's own shape exactly.
 */
export function useServiceCategoryListing(pageSize: number = DEFAULT_PAGE_SIZE): UseServiceCategoryListingResult {
  const serviceCategoryService = useServiceCategoryService();
  const [page, setPage] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    serviceCategoryService
      .getServiceCategories({ page, size: pageSize })
      .then((result) => {
        if (cancelled) return;
        setServiceCategories(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, "Could not load service categories."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, refreshToken]);

  return {
    serviceCategories,
    page,
    setPage,
    totalPages,
    isLoading,
    loadError,
    refetch: () => setRefreshToken((t) => t + 1),
  };
}
