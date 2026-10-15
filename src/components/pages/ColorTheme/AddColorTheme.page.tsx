import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box } from "@mui/material";
import ColorThemeForm from "../../templates/ColorTheme/ColorThemeForm.template";
import { useColorThemeService } from "../../../services/useColorThemeService";
import type { ColorThemePayload } from "../../../services/useColorThemeService";
import { getErrorMessage } from "../../../utils/helper";

// Route-gated SUPER_ADMIN-only in AdminRoutes.tsx (a curated ADMIN hitting this URL
// directly is redirected before this page ever mounts) - matches
// ColorThemeController's hasRole('SUPER_ADMIN') on POST /api/v1/color-themes.
const AddColorThemePage: React.FC = () => {
  const navigate = useNavigate();
  const colorThemeService = useColorThemeService();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ColorThemePayload) => {
    setError(null);
    try {
      await colorThemeService.createColorTheme(values);
      navigate("/admin/color-themes");
    } catch (err) {
      setError(getErrorMessage(err, "Could not create this color theme."));
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <ColorThemeForm mode="create" onSubmit={handleSubmit} />
    </Box>
  );
};

export default AddColorThemePage;
