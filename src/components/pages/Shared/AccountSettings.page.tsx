import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import ColorThemeListingTemplate from "../../templates/ColorTheme/ColorThemeListing.template";
import { useColorThemeListing } from "../../../hooks/useColorThemeListing";

/**
 * Mounted at /{role}/account-settings under every route shell (admin/caretaker/elder/
 * family) - the one page every role reaches regardless of the DB-driven admin sidebar
 * (useSidebarNavItems), which stays empty for caretaker/elder/family until that role's
 * own nav gets built. Reached via DashboardLayout's shared account menu instead, so it
 * works identically across all five roles without depending on any seeded NavLink row.
 *
 * Today this holds only the "pick your theme" entry point this prompt asks for - a
 * read-only-mutation view of the full catalog (view + apply only, no add/edit/delete)
 * since every authenticated user can apply a theme to themselves (UserThemeController,
 * Prompt 44) but theme AUTHORING stays an admin-only concern (ColorThemeController,
 * Prompt 43), handled by the separate /admin/color-themes pages instead. Later prompts
 * can add more sections here (profile, notifications, etc.) without a new page or route.
 */
const AccountSettingsPage: React.FC = () => {
  const { colorThemes, page, setPage, totalPages, isLoading, loadError, refetch } = useColorThemeListing();

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Account Settings
      </Typography>

      <Typography variant="h6" fontWeight={700} mt={3} mb={1}>
        Theme
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Pick a color theme to apply to your own dashboard.
      </Typography>

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
        allowMutations={false}
      />
    </Box>
  );
};

export default AccountSettingsPage;
