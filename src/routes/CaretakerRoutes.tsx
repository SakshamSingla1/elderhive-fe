import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import DashboardLayout from "../layouts/DashboardLayout";
import { useSidebarNavItems } from "../hooks/useSidebarNavItems";

const PlaceholderDashboardPage = lazy(() => import("../components/pages/Dashboard/PlaceholderDashboard.page"));

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
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PlaceholderDashboardPage roleLabel={ROLE_LABEL} />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default CaretakerRoutes;
