import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  /** Passed straight through to react-router's NavLink `end` prop — set true for a nav
   *  item whose path is a prefix of another item's (e.g. the shell's own root/dashboard
   *  path), so it isn't shown "active" while actually viewing a different page under it. */
  end?: boolean;
}

export interface DashboardLayoutProps {
  /**
   * Fed by Phase 4 Prompt 35's useSidebarNavItems hook (GET /nav-links/me, mapped to this
   * shape) once the real route shells exist — deliberately just a prop here, not fetched
   * by this component itself, so DashboardLayout stays a pure shell with no data-fetching
   * of its own and no knowledge of where its nav items come from.
   */
  navItems: SidebarNavItem[];
  /** Shown under the brand in the sidebar header and used to derive the account menu's
   *  display — e.g. "Admin", "Elder", "Caretaker". */
  roleLabel: string;
}

export const SIDEBAR_WIDTH = 248;
/** Width of the desktop rail once collapsed — wide enough for a centered 24px icon plus
 *  its hit target, narrow enough to read as "minimized" rather than a second full drawer. */
export const SIDEBAR_WIDTH_COLLAPSED = 84;

// Device/screen preference, not tied to which of the 5 dashboards is open or which
// account is logged in — "I like a slim sidebar" doesn't vary per role or per user.
const SIDEBAR_COLLAPSED_STORAGE_KEY = "elderhive.sidebarCollapsed";

const pageTransitionVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

interface SidebarContentProps {
  navItems: SidebarNavItem[];
  roleLabel: string;
  rail: boolean;
  onItemClick?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ navItems, roleLabel, rail, onItemClick }) => {
  const location = useLocation();

  return (
  <>
    <Toolbar sx={{ gap: 1.25, py: 2.25, px: rail ? 1.5 : 2.5, justifyContent: rail ? "center" : "flex-start" }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: "11px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          flexShrink: 0,
        }}
      >
        <FavoriteIcon fontSize="small" />
      </Box>
      {!rail && (
        <Box minWidth={0}>
          {/* component="span": persistent chrome repeated on every authenticated page,
              not this page's own content heading — kept out of the h1-h6 outline so each
              page's own <h1> is the first heading a screen reader encounters. */}
          <Typography variant="subtitle1" component="span" fontWeight={800} lineHeight={1.1} noWrap>
            ElderHive
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {roleLabel}
          </Typography>
        </Box>
      )}
    </Toolbar>
    <Divider />
    <List sx={{ px: rail ? 1 : 1.5, py: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
      {navItems.map((item) => {
        // Computed manually (not via NavLink's own auto-applied "active" class) — the
        // same approach ElderSphere's Sidebar uses, since relying on that class making it
        // through MUI's styled-component layer intact is less certain than just checking
        // the current location directly.
        const isActive = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
        const button = (
          <ListItemButton
            component={NavLink}
            to={item.path}
            end={item.end}
            onClick={onItemClick}
            sx={{
              borderRadius: "12px",
              minHeight: 46,
              justifyContent: rail ? "center" : "flex-start",
              px: rail ? 1 : 1.75,
              ...(isActive && {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "& .MuiListItemIcon-root": { color: "inherit" },
              }),
            }}
          >
            <ListItemIcon sx={{ minWidth: rail ? "auto" : 38, "& svg": { fontSize: 21 } }}>{item.icon}</ListItemIcon>
            {!rail && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />}
          </ListItemButton>
        );
        return rail ? (
          <Tooltip key={item.path} title={item.label} placement="right" arrow>
            {button}
          </Tooltip>
        ) : (
          <React.Fragment key={item.path}>{button}</React.Fragment>
        );
      })}
    </List>
  </>
  );
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
  // "docked rail" affordance to shrink to, so everything downstream reads `rail`, not the
  // raw `collapsed` state, so it can't do so by accident.
  const rail = collapsed && !isMobile;
  const sidebarWidth = rail ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  const handleLogout = async () => {
    setAccountMenuAnchor(null);
    await logout();
    navigate("/login");
  };

  const pageTitle =
    location.pathname
      .split("/")
      .filter(Boolean)
      .slice(1)
      .join(" / ")
      .split("-")
      .join(" ") || "Dashboard";

  return (
    <Box sx={{ display: "flex" }}>
      {/* TODO (later phase): OnboardingTour — a first-login guided walkthrough of the
          dashboard, mirroring ElderSphere's OnboardingTour. Render it here once built,
          passing roleLabel + navItems the same way ElderSphere's does. */}

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box" } }}
        >
          <SidebarContent navItems={navItems} roleLabel={roleLabel} rail={false} onItemClick={() => setMobileOpen(false)} />
        </Drawer>
      ) : (
        <Box sx={{ position: "relative", flexShrink: 0, width: sidebarWidth, transition: "width 0.2s ease" }}>
          <Drawer
            variant="permanent"
            sx={{
              width: sidebarWidth,
              flexShrink: 0,
              [`& .MuiDrawer-paper`]: {
                width: sidebarWidth,
                boxSizing: "border-box",
                borderRight: "1px solid",
                borderColor: "divider",
                overflowX: "hidden",
                transition: "width 0.2s ease",
              },
            }}
          >
            <SidebarContent navItems={navItems} roleLabel={roleLabel} rail={rail} />
          </Drawer>
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
              {rail ? <ChevronRightRoundedIcon fontSize="small" /> : <ChevronLeftRoundedIcon fontSize="small" />}
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
                <MenuIcon />
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
            {/* TODO (later phase): notification bell, mirroring ElderSphere's
                NotificationBell — wire up once Notification/NotificationDeliveryLog
                endpoints exist. */}
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
              <MenuItem onClick={handleLogout}>
                <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> Sign out
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
