import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppBar, Avatar, Box, Divider, IconButton, Menu, MenuItem, Toolbar, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight, FiLogOut, FiMenu, FiSettings } from "react-icons/fi";
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED, type SidebarNavItem } from "../components/molecules/Sidebar/Sidebar";
import NotificationBell from "../components/molecules/NotificationBell/NotificationBell";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";

export type { SidebarNavItem };

export interface DashboardLayoutProps {
  /**
   * Fed by hooks/useSidebarNavItems.ts (GET /nav-links/me, mapped to this shape) by each
   * role's route shell (routes/*Routes.tsx, Prompt 35) — deliberately just a prop here,
   * not fetched by this component itself, so DashboardLayout stays a pure shell with no
   * data-fetching of its own and no knowledge of where its nav items come from.
   */
  navItems: SidebarNavItem[];
  /** Shown under the brand in the sidebar header and used in the account menu's display —
   *  e.g. "Admin", "Elder", "Caretaker". */
  roleLabel: string;
}

// Device/screen preference, not tied to which of the 5 dashboards is open or which
// account is logged in — "I like a slim sidebar" doesn't vary per role or per user.
const SIDEBAR_COLLAPSED_STORAGE_KEY = "elderhive.sidebarCollapsed";

const pageTransitionVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// Shared chrome for every authenticated shell (Super Admin / Admin / Caretaker / Family /
// Elder) — only the sidebar nav items and role label differ per role; see routes/*Routes
// (Prompt 35). The sidebar/topbar chrome stays mounted across in-shell navigation; only
// the Outlet content below fades+rises on each page change (keyed by pathname).
//
// Below the `md` breakpoint the sidebar renders as a hamburger-triggered temporary drawer
// instead of a permanently docked rail — `mobileOpen` is lifted here so the topbar's
// hamburger button and the sidebar's drawer/backdrop/nav-click-to-close all share one
// open state.
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ navItems, roleLabel }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuthenticatedUser();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Private-browsing / storage-disabled: the toggle still works for this session, it
      // just won't be remembered on the next visit — not worth surfacing to the user.
    }
  }, [collapsed]);

  // Mobile's temporary drawer never collapses to a rail — a phone-width overlay has no
  // "docked rail" affordance to shrink to.
  const rail = collapsed && !isMobile;
  const sidebarWidth = rail ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  const handleLogout = async () => {
    setAccountMenuAnchor(null);
    await logout();
    navigate("/login");
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);
  // First segment is always this shell's own role prefix ("admin"/"caretaker"/"elder"/
  // "family") regardless of which of the 5 roles is logged in — used below to reach
  // the shared Account Settings page without this component needing a dedicated prop
  // for it (every route shell already mounts it at "<rolePrefix>/account-settings",
  // Prompt 51).
  const rolePrefix = pathSegments[0];

  const handleAccountSettings = () => {
    setAccountMenuAnchor(null);
    navigate(`/${rolePrefix}/account-settings`);
  };

  const pageTitle = pathSegments.slice(1).join(" / ").split("-").join(" ") || "Dashboard";

  return (
    <Box sx={{ display: "flex" }}>
      {/* TODO (later phase): OnboardingTour — a first-login guided walkthrough of the
          dashboard, mirroring ElderSphere's OnboardingTour. Render it here once built,
          passing roleLabel + navItems the same way ElderSphere's does. */}

      {isMobile ? (
        <Sidebar
          navItems={navItems}
          roleLabel={roleLabel}
          isMobile
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      ) : (
        <Box sx={{ position: "relative", flexShrink: 0, width: sidebarWidth, transition: "width 0.2s ease" }}>
          <Sidebar navItems={navItems} roleLabel={roleLabel} collapsed={collapsed} />
          {/* Floating edge tab, half on/half off the drawer's border. */}
          <Tooltip title={rail ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <IconButton
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
              size="small"
              sx={{
                position: "fixed",
                top: 84,
                left: sidebarWidth - 14,
                zIndex: (t) => t.zIndex.drawer + 1,
                width: 28,
                height: 28,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                transition: "left 0.2s ease",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {rail ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { xs: "100%", md: `calc(100% - ${sidebarWidth}px)` },
          ml: { xs: 0, md: `${sidebarWidth}px` },
          transition: "width 0.2s ease, margin 0.2s ease",
          borderBottom: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" edge="start">
                <FiMenu />
              </IconButton>
            )}
            <Typography variant="h6" component="div" fontWeight={700} textTransform="capitalize" noWrap>
              {pageTitle}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {/* TODO (later phase): command palette trigger (Cmd+K quick nav), mirroring
                ElderSphere's CommandPalette — reuse this shell's own navItems so it can
                never offer a destination this role can't actually reach. */}
            <NotificationBell />
            <IconButton onClick={(e) => setAccountMenuAnchor(e.currentTarget)} aria-label="Open account menu">
              <Avatar sx={{ width: 36, height: 36, fontSize: 15 }}>
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </Avatar>
            </IconButton>
            <Menu anchorEl={accountMenuAnchor} open={Boolean(accountMenuAnchor)} onClose={() => setAccountMenuAnchor(null)}>
              <Box px={2} py={1} minWidth={200}>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {user?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleAccountSettings}>
                <FiSettings size={18} style={{ marginRight: 12 }} /> Account Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <FiLogOut size={18} style={{ marginRight: 12 }} /> Sign out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: "background.default", minHeight: "100vh", minWidth: 0 }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2.5, sm: 3, md: 4 }, maxWidth: 1600, mx: "auto" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
