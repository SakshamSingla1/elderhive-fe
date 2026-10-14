import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip, Typography } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  /** Passed straight through to react-router's NavLink `end` prop — set true for a nav
   *  item whose path is a prefix of another item's (e.g. the shell's own root/dashboard
   *  path), so it isn't shown "active" while actually viewing a different page under it. */
  end?: boolean;
  /**
   * Optional section label (e.g. "Overview", "Platform") — items sharing the same
   * `group` are rendered together under one small heading + divider. Items with no
   * `group` render exactly as before (flat, no heading) — opt-in per item, matching
   * which NavLink rows an admin has actually given a navGroup to (Phase 3, Prompt 21).
   */
  group?: string;
  /** Sort key — mirrors the backend NavLink's own navIndex (Phase 3). Defaults to 0 when
   *  omitted, so manually-constructed items (not sourced from useSidebarNavItems) without
   *  one simply keep their original relative order (Array.prototype.sort is stable). */
  navIndex?: number;
}

export interface SidebarProps {
  navItems: SidebarNavItem[];
  roleLabel: string;
  /** Controlled open state for the mobile (temporary) drawer variant. Ignored on desktop. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Desktop-only icon-rail mode — the mobile (temporary) drawer always renders full-width
   *  regardless of this prop, since a phone-width overlay has no "docked rail" affordance
   *  to collapse to. */
  collapsed?: boolean;
  isMobile?: boolean;
}

export const SIDEBAR_WIDTH = 248;
/** Width of the desktop rail once collapsed — wide enough for a centered 24px icon plus
 *  its hit target, narrow enough to read as "minimized" rather than a second full drawer. */
export const SIDEBAR_WIDTH_COLLAPSED = 84;

// Sorts by navIndex (ascending, stable — ties keep their original relative order), THEN
// renders a group heading whenever an item's `group` differs from the previous item's -
// the same adjacent-comparison approach ElderSphere's own Sidebar uses, just computed
// here instead of assumed pre-sorted on the way in, so this component is self-sufficient
// regardless of what order its caller's navItems happen to arrive in.
function sortNavItems(navItems: SidebarNavItem[]): SidebarNavItem[] {
  return [...navItems].sort((a, b) => (a.navIndex ?? 0) - (b.navIndex ?? 0));
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, roleLabel, mobileOpen = false, onMobileClose, collapsed = false, isMobile = false }) => {
  const location = useLocation();
  // Mobile's temporary drawer never collapses to a rail (see SidebarProps doc) -
  // everything downstream reads `rail`, not the raw `collapsed` prop, so it can't do so
  // by accident.
  const rail = collapsed && !isMobile;
  const sortedItems = sortNavItems(navItems);

  const content = (
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
                not this page's own content heading — kept out of the h1-h6 outline so
                each page's own <h1> is the first heading a screen reader encounters. */}
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
        {sortedItems.length === 0 && !rail && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.75, py: 1 }}>
            Nothing here yet.
          </Typography>
        )}
        {sortedItems.map((item, idx) => {
          const isActive = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
          const showGroupHeading = Boolean(item.group) && item.group !== sortedItems[idx - 1]?.group;
          const button = (
            <ListItemButton
              component={NavLink}
              to={item.path}
              end={item.end}
              onClick={isMobile ? onMobileClose : undefined}
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
          return (
            <React.Fragment key={item.path}>
              {showGroupHeading &&
                (rail ? (
                  idx > 0 && <Divider sx={{ my: 0.75, mx: 1 }} />
                ) : (
                  <>
                    {idx > 0 && <Divider sx={{ my: 1 }} />}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", px: 1.75, pt: idx > 0 ? 0.5 : 0, pb: 0.75, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}
                    >
                      {item.group}
                    </Typography>
                  </>
                ))}
              {rail ? (
                <Tooltip title={item.label} placement="right" arrow>
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </React.Fragment>
          );
        })}
      </List>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{ "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box" } }}
      >
        {content}
      </Drawer>
    );
  }

  const width = rail ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: "width 0.2s ease",
        [`& .MuiDrawer-paper`]: {
          width,
          boxSizing: "border-box",
          borderRight: "1px solid",
          borderColor: "divider",
          overflowX: "hidden",
          transition: "width 0.2s ease",
        },
      }}
    >
      {content}
    </Drawer>
  );
};

export default Sidebar;
