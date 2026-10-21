import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { FiUser } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import { useSidebarNavItems } from "../hooks/useSidebarNavItems";
import type { SidebarNavItem } from "../components/molecules/Sidebar/Sidebar";

const PlaceholderDashboardPage = lazy(() => import("../components/pages/Dashboard/PlaceholderDashboard.page"));
const AccountSettingsPage = lazy(() => import("../components/pages/Shared/AccountSettings.page"));
const NotificationsPage = lazy(() => import("../components/pages/Shared/Notifications.page"));
const MyProfilePage = lazy(() => import("../components/pages/Caretaker/MyProfile.page"));

const LoadingFallback: React.FC = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
    <CircularProgress />
  </Box>
);

const ROLE_LABEL = "Caretaker";

// NavLinkServiceImpl#getMine always returns [] for a CARETAKER caller (nav_links only
// ever models the admin portal, see NavLink's own javadoc), so the DB-driven navItems
// below are always empty for this role today — this static entry (Prompt 69's real page)
// is appended client-side rather than waiting on a NavLink admin UI that doesn't exist
// yet, giving this role actual sidebar navigation.
const STATIC_NAV_ITEMS: SidebarNavItem[] = [
  { label: "My Profile", path: "/caretaker/my-profile", icon: <FiUser size={18} />, navIndex: 1 },
];

const CaretakerRoutes: React.FC = () => {
  const { navItems, isLoading } = useSidebarNavItems();

  if (isLoading) return <LoadingFallback />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<DashboardLayout navItems={[...navItems, ...STATIC_NAV_ITEMS]} roleLabel={ROLE_LABEL} />}>
          <Route index element={<Navigate to="/caretaker/dashboard" replace />} />
          <Route path="dashboard" element={<PlaceholderDashboardPage roleLabel={ROLE_LABEL} />} />
          {/* Every role's shared "pick your theme" entry point (Prompt 51) — reached via
              DashboardLayout's account menu, not the (currently empty) DB-driven sidebar. */}
          <Route path="account-settings" element={<AccountSettingsPage />} />
          {/* Reached via NotificationBell's "View all" link (Prompt 60), same
              outside-the-sidebar pattern as account-settings above. */}
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="my-profile" element={<MyProfilePage />} />
          <Route path="*" element={<Navigate to="/caretaker/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default CaretakerRoutes;
