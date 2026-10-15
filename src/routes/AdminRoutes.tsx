import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import DashboardLayout from "../layouts/DashboardLayout";
import { useSidebarNavItems } from "../hooks/useSidebarNavItems";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";
import { UserTypeEnum } from "../utils/enums";

const PlaceholderDashboardPage = lazy(() => import("../components/pages/Dashboard/PlaceholderDashboard.page"));
const PlatformSettingsPage = lazy(() => import("../components/pages/Admin/PlatformSettings.page"));

const LoadingFallback: React.FC = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
    <CircularProgress />
  </Box>
);

// Serves BOTH ADMIN and SUPER_ADMIN — they share one dashboard shell and home
// (homePathForUser puts both at /admin/dashboard, ProtectedRoute admits both to /admin/*
// in App.tsx) — only the displayed roleLabel differs.
const AdminRoutes: React.FC = () => {
  const { user } = useAuthenticatedUser();
  const { navItems, isLoading } = useSidebarNavItems();
  const isSuperAdmin = user?.primaryRole === UserTypeEnum.SUPER_ADMIN;
  const roleLabel = isSuperAdmin ? "Super Admin" : "Admin";

  if (isLoading) return <LoadingFallback />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<DashboardLayout navItems={navItems} roleLabel={roleLabel} />}>
          {/* Absolute targets, not relative ("dashboard") — a relative Navigate rendered
              from inside the "*" splat route resolves against the splat's OWN matched
              segment rather than replacing it, which compounds into a runaway
              /admin/platform-settings/dashboard/dashboard/dashboard/... accumulation the
              moment platform-settings's own redirect (below) lands somewhere that then
              falls through to "*" again. Caught the hard way: a test for the ADMIN ->
              platform-settings redirect hung with exactly that accumulating pathname. */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<PlaceholderDashboardPage roleLabel={roleLabel} />} />
          {/*
            Super-Admin-only, gated the same way RolesPermissions will be: CONFIG_MANAGE
            (like ROLE_MANAGE) is Super-Admin-only in practice per the Phase 3 seeding, and
            there's no FE-side fine-grained-permission check yet (only userType-level
            gating via ProtectedRoute, which already admits both ADMIN and SUPER_ADMIN to
            this whole /admin/* shell) — so this one sub-route redirects a plain ADMIN back
            to dashboard rather than rendering the page for them.
          */}
          <Route
            path="platform-settings"
            element={isSuperAdmin ? <PlatformSettingsPage /> : <Navigate to="/admin/dashboard" replace />}
          />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;
