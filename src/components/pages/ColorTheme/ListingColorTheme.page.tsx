import React from "react";
import { Alert } from "@mui/material";
import ColorThemeListingTemplate from "../../templates/ColorTheme/ColorThemeListing.template";
import { useColorThemeListing } from "../../../hooks/useColorThemeListing";

// Visible to both ADMIN and SUPER_ADMIN (mounted under /admin/color-themes in
// AdminRoutes.tsx, which admits both) - mutation buttons are gated SUPER_ADMIN-only
// inside the template itself, matching Prompt 43's backend gating.
const ListingColorThemePage: React.FC = () => {
  const { colorThemes, page, setPage, totalPages, isLoading, loadError, refetch } = useColorThemeListing();

  return (
    <>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      <ColorThemeListingTemplate
        colorThemes={colorThemes}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRefresh={refetch}
        isLoading={isLoading}
      />
    </>
  );
};

export default ListingColorThemePage;
