import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import DashboardLayout from "../layouts/DashboardLayout";
import { useSidebarNavItems } from "../hooks/useSidebarNavItems";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";
import { UserTypeEnum } from "../utils/enums";

const PlaceholderDashboardPage = lazy(() => import("../components/pages/Dashboard/PlaceholderDashboard.page"));

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
  const roleLabel = user?.primaryRole === UserTypeEnum.SUPER_ADMIN ? "Super Admin" : "Admin";

  if (isLoading) return <LoadingFallback />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<DashboardLayout navItems={navItems} roleLabel={roleLabel} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PlaceholderDashboardPage roleLabel={roleLabel} />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;
