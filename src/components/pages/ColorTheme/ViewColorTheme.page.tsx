import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, CircularProgress } from "@mui/material";
import ColorThemeForm from "../../templates/ColorTheme/ColorThemeForm.template";
import { useColorThemeService } from "../../../services/useColorThemeService";
import type { ColorThemeResponse } from "../../../services/useColorThemeService";
import { getErrorMessage } from "../../../utils/helper";

// Visible to both ADMIN and SUPER_ADMIN (mounted under /admin/color-themes/:id in
// AdminRoutes.tsx), matching ColorThemeController's isAuthenticated()-only GET.
const ViewColorThemePage: React.FC = () => {
  const { id } = useParams();
  const themeId = id ? Number(id) : null;
  const colorThemeService = useColorThemeService();

  const [colorTheme, setColorTheme] = useState<ColorThemeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (themeId == null) {
      setLoadError("Invalid theme id.");
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    colorThemeService
      .getColorThemeById(themeId)
      .then((result) => {
        if (!cancelled) setColorTheme(result);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, "Could not load this color theme."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  return <ColorThemeForm mode="view" colorTheme={colorTheme} onSubmit={() => {}} />;
};

export default ViewColorThemePage;
