import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, CircularProgress } from "@mui/material";
import ColorThemeForm from "../../templates/ColorTheme/ColorThemeForm.template";
import { useColorThemeService } from "../../../services/useColorThemeService";
import type { ColorThemePayload, ColorThemeResponse } from "../../../services/useColorThemeService";
import { getErrorMessage } from "../../../utils/helper";

// Route-gated SUPER_ADMIN-only in AdminRoutes.tsx, matching ColorThemeController's
// hasRole('SUPER_ADMIN') on PUT /api/v1/color-themes/:id.
const EditColorThemePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const themeId = id ? Number(id) : null;
  const colorThemeService = useColorThemeService();

  const [colorTheme, setColorTheme] = useState<ColorThemeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleSubmit = async (values: ColorThemePayload) => {
    if (themeId == null) return;
    setSubmitError(null);
    try {
      await colorThemeService.updateColorTheme(themeId, values);
      navigate("/admin/color-themes");
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Could not update this color theme."));
    }
  };

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

  return (
    <Box>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}
      <ColorThemeForm mode="edit" colorTheme={colorTheme} onSubmit={handleSubmit} />
    </Box>
  );
};

export default EditColorThemePage;
