import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { FiAlertTriangle, FiCalendar, FiMail, FiMessageCircle, FiShoppingBag, FiStar, FiUsers } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import { useSidebarNavItems } from "../hooks/useSidebarNavItems";
import type { SidebarNavItem } from "../components/molecules/Sidebar/Sidebar";

const PlaceholderDashboardPage = lazy(() => import("../components/pages/Dashboard/PlaceholderDashboard.page"));
const AccountSettingsPage = lazy(() => import("../components/pages/Shared/AccountSettings.page"));
const NotificationsPage = lazy(() => import("../components/pages/Shared/Notifications.page"));
const ElderProfilesPage = lazy(() => import("../components/pages/Family/ElderProfiles/ElderProfiles.page"));
const ElderProfilesFormPage = lazy(() => import("../components/pages/Family/ElderProfiles/ElderProfilesForm.page"));
const LinkElderProfilePage = lazy(() => import("../components/pages/Family/ElderProfiles/LinkElderProfile.page"));
const InvitesPage = lazy(() => import("../components/pages/Family/Invites.page"));
const BrowseServicesPage = lazy(() => import("../components/pages/Family/BrowseServices.page"));
const BookingsPage = lazy(() => import("../components/pages/Family/Bookings/Bookings.page"));
const BookingFormPage = lazy(() => import("../components/pages/Family/Bookings/BookingForm.page"));
const BookingDetailPage = lazy(() => import("../components/pages/Family/Bookings/BookingDetail.page"));
const EmergencyPage = lazy(() => import("../components/pages/Family/Emergency.page"));
const ReviewsPage = lazy(() => import("../components/pages/Family/Reviews.page"));
const MessagesPage = lazy(() => import("../components/pages/Shared/Messages.page"));

const LoadingFallback: React.FC = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
    <CircularProgress />
  </Box>
);

const ROLE_LABEL = "Family";

// NavLinkServiceImpl#getMine always returns [] for a FAMILY_MEMBER caller (nav_links
// only ever models the admin portal, see NavLink's own javadoc), so the DB-driven
// navItems below are always empty for this role today — these two static entries
// (Prompt 69's real pages) are appended client-side rather than waiting on a NavLink
// admin UI that doesn't exist yet, giving this role actual sidebar navigation.
const STATIC_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Elder Profiles", path: "/family/elder-profiles", icon: <FiUsers size={18} />, navIndex: 1 },
  { label: "Invites", path: "/family/invites", icon: <FiMail size={18} />, navIndex: 2 },
  { label: "Browse Services", path: "/family/services", icon: <FiShoppingBag size={18} />, navIndex: 3 },
  { label: "My Bookings", path: "/family/bookings", icon: <FiCalendar size={18} />, navIndex: 4 },
  { label: "Emergency", path: "/family/emergency", icon: <FiAlertTriangle size={18} />, navIndex: 5 },
  { label: "Messages", path: "/family/messages", icon: <FiMessageCircle size={18} />, navIndex: 6 },
];

const FamilyRoutes: React.FC = () => {
  const { navItems, isLoading } = useSidebarNavItems();

  if (isLoading) return <LoadingFallback />;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<DashboardLayout navItems={[...navItems, ...STATIC_NAV_ITEMS]} roleLabel={ROLE_LABEL} />}>
          <Route index element={<Navigate to="/family/dashboard" replace />} />
          <Route path="dashboard" element={<PlaceholderDashboardPage roleLabel={ROLE_LABEL} />} />
          {/* Every role's shared "pick your theme" entry point (Prompt 51) — reached via
              DashboardLayout's account menu, not the (currently empty) DB-driven sidebar. */}
          <Route path="account-settings" element={<AccountSettingsPage />} />
          {/* Reached via NotificationBell's "View all" link (Prompt 60), same
              outside-the-sidebar pattern as account-settings above. */}
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="elder-profiles" element={<ElderProfilesPage />} />
          <Route path="elder-profiles/link" element={<LinkElderProfilePage />} />
          <Route path="elder-profiles/new" element={<ElderProfilesFormPage />} />
          <Route path="elder-profiles/:id" element={<ElderProfilesFormPage />} />
          <Route path="invites" element={<InvitesPage />} />
          <Route path="services" element={<BrowseServicesPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/new" element={<BookingFormPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="emergency" element={<EmergencyPage />} />
          {/* Reached via BookingDetail.page.tsx's own "Leave a Review"/"View Your Review"
              link with ?bookingId= (Prompt 91) — same "outside-the-sidebar, reached from
              elsewhere" pattern as account-settings/notifications above, not a standalone
              STATIC_NAV_ITEMS destination. */}
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="*" element={<Navigate to="/family/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default FamilyRoutes;
