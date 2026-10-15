import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import DashboardLayout from "../layouts/DashboardLayout";
import { useSidebarNavItems } from "../hooks/useSidebarNavItems";

const PlaceholderDashboardPage = lazy(() => import("../components/pages/Dashboard/PlaceholderDashboard.page"));
const AccountSettingsPage = lazy(() => import("../components/pages/Shared/AccountSettings.page"));

const LoadingFallback: React.FC = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
    <CircularProgress />
  </Box>
);

const ROLE_LABEL = "Caretaker";

// NavLinkServiceImpl#getMine always returns [] for a CARETAKER caller (nav_links only
// ever models the admin portal, see NavLink's own javadoc) — this shell's sidebar is
// genuinely near-empty by design, not a bug, until this role's own nav gets built as FE
// route tree entries in a later phase.
const CaretakerRoutes: React.FC = () => {
  const { navItems, isLoading } = useSidebarNavItems();

  if (isLoading) return <LoadingFallback />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<DashboardLayout navItems={navItems} roleLabel={ROLE_LABEL} />}>
          <Route index element={<Navigate to="/caretaker/dashboard" replace />} />
          <Route path="dashboard" element={<PlaceholderDashboardPage roleLabel={ROLE_LABEL} />} />
          {/* Every role's shared "pick your theme" entry point (Prompt 51) — reached via
              DashboardLayout's account menu, not the (currently empty) DB-driven sidebar. */}
          <Route path="account-settings" element={<AccountSettingsPage />} />
          <Route path="*" element={<Navigate to="/caretaker/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default CaretakerRoutes;
