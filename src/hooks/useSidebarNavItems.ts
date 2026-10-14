import React, { useEffect, useState } from "react";
import { FiBook, FiCalendar, FiCircle, FiKey, FiUserCheck, FiUsers } from "react-icons/fi";
import { MdBarChart, MdDashboard, MdEmergency, MdPalette, MdRoomService, MdSecurity } from "react-icons/md";
import { useNavLinkService } from "../services/useNavLinkService";
import { NavLinkStatusEnum } from "../utils/enums";
import type { SidebarNavItem } from "../components/molecules/Sidebar/Sidebar";

/**
 * Maps a NavLink's free-text `icon` column (Phase 3, Prompt 21 — a loose string with no
 * established naming convention yet, since no admin UI for editing nav links exists to
 * curate real values) to an actual icon component. Small and deliberately placeholder —
 * extend this registry as real NavLink rows get created with real icon values; anything
 * unrecognized (including no icon at all) falls back to a plain circle rather than
 * rendering nothing.
 */
const ICON_REGISTRY: Record<string, React.ComponentType<{ size?: number }>> = {
  dashboard: MdDashboard,
  users: FiUsers,
  roles: MdSecurity,
  permissions: FiKey,
  "nav-links": FiBook,
  theme: MdPalette,
  services: MdRoomService,
  bookings: FiCalendar,
  caretakers: FiUserCheck,
  emergency: MdEmergency,
  analytics: MdBarChart,
};

function resolveIcon(iconKey: string | null | undefined): React.ReactNode {
  const IconComponent = (iconKey && ICON_REGISTRY[iconKey.toLowerCase()]) || FiCircle;
  return React.createElement(IconComponent, { size: 18 });
}

export interface UseSidebarNavItemsResult {
  navItems: SidebarNavItem[];
  isLoading: boolean;
  error: unknown;
}

/**
 * Fetches GET /nav-links/me once per mount and maps the result to SidebarNavItem[] for
 * DashboardLayout/Sidebar (Prompt 34). Deliberately a one-shot fetch, not a subscription —
 * nav items changing while a session is already open (an admin editing the catalog
 * elsewhere) is rare enough that requiring a reload/re-login to pick it up is an
 * acceptable tradeoff against the complexity of live-updating the sidebar mid-session.
 *
 * For ELDER/FAMILY_MEMBER/CARETAKER callers, NavLinkServiceImpl#getMine always returns an
 * empty list (see NavLink's own javadoc) — this hook has no special-casing for that, it
 * just reflects whatever the backend actually returns, which is correct either way.
 */
export function useSidebarNavItems(): UseSidebarNavItemsResult {
  const navLinkService = useNavLinkService();
  const [navItems, setNavItems] = useState<SidebarNavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    navLinkService
      .getMine()
      .then((response) => {
        if (cancelled) return;
        const mapped: SidebarNavItem[] = response
          .filter((link) => link.status === NavLinkStatusEnum.ACTIVE)
          .map((link) => ({
            label: link.name,
            path: link.path,
            icon: resolveIcon(link.icon),
            group: link.navGroup ?? undefined,
            navIndex: link.navIndex,
          }));
        setNavItems(mapped);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { navItems, isLoading, error };
}
