import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiDroplet, FiFileText, FiGlobe, FiMail, FiSettings, FiShield, FiShoppingBag, FiTag, FiUsers } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import { useSidebarNavItems } from "../hooks/useSidebarNavItems";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";
import { UserTypeEnum } from "../utils/enums";
import type { SidebarNavItem } from "../components/molecules/Sidebar/Sidebar";

const AdminDashboardPage = lazy(() => import("../components/pages/Admin/Dashboard.page"));
const AdminUsersPage = lazy(() => import("../components/pages/Admin/Users.page"));
const PlatformSettingsPage = lazy(() => import("../components/pages/Admin/PlatformSettings.page"));
const ListingColorThemePage = lazy(() => import("../components/pages/ColorTheme/ListingColorTheme.page"));
const AddColorThemePage = lazy(() => import("../components/pages/ColorTheme/AddColorTheme.page"));
const EditColorThemePage = lazy(() => import("../components/pages/ColorTheme/EditColorTheme.page"));
const ViewColorThemePage = lazy(() => import("../components/pages/ColorTheme/ViewColorTheme.page"));
const AccountSettingsPage = lazy(() => import("../components/pages/Shared/AccountSettings.page"));
const NotificationsPage = lazy(() => import("../components/pages/Shared/Notifications.page"));
const CaretakerVerificationPage = lazy(() => import("../components/pages/Admin/CaretakerVerification.page"));
const CaretakerVerificationFormPage = lazy(() => import("../components/pages/Admin/CaretakerVerificationForm.page"));
const ServiceCategoriesPage = lazy(() => import("../components/pages/Admin/ServiceCategories.page"));
const ServiceCategoriesFormPage = lazy(() => import("../components/pages/Admin/ServiceCategoriesForm.page"));
const ServicesPage = lazy(() => import("../components/pages/Admin/Services.page"));
const ServicesFormPage = lazy(() => import("../components/pages/Admin/ServicesForm.page"));
const AdminBookingsPage = lazy(() => import("../components/pages/Admin/Bookings.page"));
const AdminBookingsFormPage = lazy(() => import("../components/pages/Admin/BookingsForm.page"));
const AdminEmergencyAlertsPage = lazy(() => import("../components/pages/Admin/EmergencyAlerts.page"));
const AdminEmergencyAlertsFormPage = lazy(() => import("../components/pages/Admin/EmergencyAlertsForm.page"));
const RolesPermissionsPage = lazy(() => import("../components/pages/Admin/RolesPermissions.page"));
const AuditLogPage = lazy(() => import("../components/pages/Admin/AuditLog.page"));
const LandingManagementPage = lazy(() => import("../components/pages/Admin/LandingManagement.page"));
const ContactUsPage = lazy(() => import("../components/pages/Admin/ContactUs.page"));

// NavLinkServiceImpl#getMine returns whatever's actually seeded for the admin portal
// today, which doesn't include these pages (Prompt 70's/74's own additions) - appended
// client-side the same way Prompt 69 did for the other three roles' real pages.
//
// Color Themes and Platform Settings (Prompts 43/44/51) were previously missing from
// here entirely - their routes existed and worked, but nothing in the UI ever linked to
// them (not the sidebar, not the account menu), so they were only reachable by typing
// the URL directly. Platform Settings is omitted for a plain ADMIN since its route
// itself just redirects them straight back to /admin/dashboard (see the route element
// below) - same redirect-not-render reasoning, applied to the link too.
function buildStaticNavItems(isSuperAdmin: boolean): SidebarNavItem[] {
  const items: SidebarNavItem[] = [
    { label: "Users", path: "/admin/users", icon: <FiUsers size={18} />, navIndex: 49 },
    { label: "Caretaker Verification", path: "/admin/caretaker-verification", icon: <FiCheckCircle size={18} />, navIndex: 50 },
    { label: "Service Categories", path: "/admin/service-categories", icon: <FiTag size={18} />, navIndex: 51 },
    { label: "Services", path: "/admin/services", icon: <FiShoppingBag size={18} />, navIndex: 52 },
    { label: "Bookings", path: "/admin/bookings", icon: <FiCalendar size={18} />, navIndex: 53 },
    { label: "Color Themes", path: "/admin/color-themes", icon: <FiDroplet size={18} />, navIndex: 54 },
    { label: "Emergency Alerts", path: "/admin/emergency-alerts", icon: <FiAlertTriangle size={18} />, navIndex: 56 },
    { label: "Landing Page", path: "/admin/landing-management", icon: <FiGlobe size={18} />, navIndex: 59 },
    { label: "Contact Us", path: "/admin/contact-us", icon: <FiMail size={18} />, navIndex: 60 },
  ];
  if (isSuperAdmin) {
    items.push({ label: "Platform Settings", path: "/admin/platform-settings", icon: <FiSettings size={18} />, navIndex: 55 });
    items.push({ label: "Roles & Permissions", path: "/admin/roles-permissions", icon: <FiShield size={18} />, navIndex: 57 });
    items.push({ label: "Audit Log", path: "/admin/audit-log", icon: <FiFileText size={18} />, navIndex: 58 });
  }
  return items;
}

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
        <Route element={<DashboardLayout navItems={[...navItems, ...buildStaticNavItems(isSuperAdmin)]} roleLabel={roleLabel} />}>
          {/* Absolute targets, not relative ("dashboard") — a relative Navigate rendered
              from inside the "*" splat route resolves against the splat's OWN matched
              segment rather than replacing it, which compounds into a runaway
              /admin/platform-settings/dashboard/dashboard/dashboard/... accumulation the
              moment platform-settings's own redirect (below) lands somewhere that then
              falls through to "*" again. Caught the hard way: a test for the ADMIN ->
              platform-settings redirect hung with exactly that accumulating pathname. */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          {/* USER_MANAGE-gated server-side only (Prompt 93's AdminUserController), same
              documented no-FE-permission-check limitation as the routes below - open to
              both ADMIN and SUPER_ADMIN at the route level; the page itself further
              restricts granting/revoking ADMIN/SUPER_ADMIN to Super-Admin viewers. */}
          <Route path="users" element={<AdminUsersPage />} />
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
          {/* ROLE_MANAGE-gated server-side (RoleController/PermissionController,
              AuditLogController), Super-Admin-only in practice per the Phase 3 seeding -
              same redirect-not-render pattern as platform-settings above. */}
          <Route
            path="roles-permissions"
            element={isSuperAdmin ? <RolesPermissionsPage /> : <Navigate to="/admin/dashboard" replace />}
          />
          <Route
            path="audit-log"
            element={isSuperAdmin ? <AuditLogPage /> : <Navigate to="/admin/dashboard" replace />}
          />
          {/* Listing/View are open to both roles (ColorThemeController's GETs are just
              isAuthenticated()); Add/Edit are SUPER_ADMIN-only, same reasoning and same
              redirect-not-render pattern as platform-settings above — matches
              ColorThemeController's hasRole('SUPER_ADMIN') on POST/PUT (Prompt 43). */}
          <Route path="color-themes" element={<ListingColorThemePage />} />
          <Route
            path="color-themes/new"
            element={isSuperAdmin ? <AddColorThemePage /> : <Navigate to="/admin/color-themes" replace />}
          />
          <Route
            path="color-themes/:id/edit"
            element={isSuperAdmin ? <EditColorThemePage /> : <Navigate to="/admin/color-themes" replace />}
          />
          <Route path="color-themes/:id" element={<ViewColorThemePage />} />
          {/* Open to both ADMIN and SUPER_ADMIN at the route level - the real gate
              (CARETAKER_VERIFY) is enforced server-side only (Prompt 65's
              @adminPermissionGuard), same documented limitation as the rest of this file:
              no FE-side fine-grained-permission check exists yet. An admin who lacks it
              just gets a 403 from the review action itself. */}
          <Route path="caretaker-verification" element={<CaretakerVerificationPage />} />
          <Route path="caretaker-verification/:id" element={<CaretakerVerificationFormPage />} />
          {/* ServiceCategoryController/ServiceOfferingController's list (and, for
              offerings, detail) GETs are isAuthenticated()-only (Prompt 73); mutations and
              GET /service-categories/{id} stay SERVICE_MANAGE-gated server-side only, same
              documented no-FE-permission-check limitation as caretaker-verification above. */}
          <Route path="service-categories" element={<ServiceCategoriesPage />} />
          <Route path="service-categories/new" element={<ServiceCategoriesFormPage />} />
          <Route path="service-categories/:id" element={<ServiceCategoriesFormPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/new" element={<ServicesFormPage />} />
          <Route path="services/:id" element={<ServicesFormPage />} />
          {/* BOOKING_MANAGE-gated server-side only (Prompt 80's backend addendum), same
              documented no-FE-permission-check limitation as the routes above. */}
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="bookings/:id" element={<AdminBookingsFormPage />} />
          {/* EMERGENCY_DISPATCH-gated server-side only (Prompt 87's own backend
              addendum), same documented no-FE-permission-check limitation as the routes
              above. */}
          <Route path="emergency-alerts" element={<AdminEmergencyAlertsPage />} />
          <Route path="emergency-alerts/:id" element={<AdminEmergencyAlertsFormPage />} />
          {/* LANDING_MANAGE/CONTACT_US_MANAGE-gated server-side only (Prompt 99) - open
              to both ADMIN and SUPER_ADMIN at the route level, same documented
              no-FE-permission-check limitation as the routes above: unlike ROLE_MANAGE/
              CONFIG_MANAGE, neither permission is Super-Admin-only in the seeder. */}
          <Route path="landing-management" element={<LandingManagementPage />} />
          <Route path="contact-us" element={<ContactUsPage />} />
          {/* Every role's shared "pick your theme" entry point (Prompt 51) — reached via
              DashboardLayout's account menu, not the DB-driven sidebar. */}
          <Route path="account-settings" element={<AccountSettingsPage />} />
          {/* Reached via NotificationBell's "View all" link (Prompt 60), same
              outside-the-sidebar pattern as account-settings above. */}
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;
