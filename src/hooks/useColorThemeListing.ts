import { useEffect, useState } from "react";
import { useColorThemeService } from "../services/useColorThemeService";
import type { ColorThemeResponse } from "../services/useColorThemeService";
import { getErrorMessage } from "../utils/helper";

const DEFAULT_PAGE_SIZE = 9;

export interface UseColorThemeListingResult {
  colorThemes: ColorThemeResponse[];
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  isLoading: boolean;
  loadError: string | null;
  /** Re-fetches the current page - e.g. after a successful delete. */
  refetch: () => void;
}

/**
 * Fetches one page of the color theme catalog and owns its pagination state - shared by
 * both the admin ListingColorTheme.page.tsx (full CRUD surface) and Shared/
 * AccountSettings.page.tsx (the read-only "pick your theme" entry point, Prompt 51),
 * which need identical data-fetching but render ColorThemeListingTemplate with a
 * different allowMutations value around it.
 */
export function useColorThemeListing(pageSize: number = DEFAULT_PAGE_SIZE): UseColorThemeListingResult {
  const colorThemeService = useColorThemeService();
  const [page, setPage] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [colorThemes, setColorThemes] = useState<ColorThemeResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    colorThemeService
      .getColorTheme({ page, size: pageSize })
      .then((result) => {
        if (cancelled) return;
        setColorThemes(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, "Could not load color themes."));
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
    colorThemes,
    page,
    setPage,
    totalPages,
    isLoading,
    loadError,
    refetch: () => setRefreshToken((t) => t + 1),
  };
}
