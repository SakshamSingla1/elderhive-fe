import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HomeIcon from "@mui/icons-material/Home";
import Sidebar, { type SidebarNavItem } from "./Sidebar";

function renderSidebar(navItems: SidebarNavItem[], props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <Sidebar navItems={navItems} roleLabel="Admin" {...props} />
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  it("renders items sorted by navIndex, regardless of the order they're passed in", () => {
    const navItems: SidebarNavItem[] = [
      { label: "Third", path: "/admin/third", icon: <HomeIcon />, navIndex: 3 },
      { label: "First", path: "/admin/first", icon: <HomeIcon />, navIndex: 1 },
      { label: "Second", path: "/admin/second", icon: <HomeIcon />, navIndex: 2 },
    ];
    renderSidebar(navItems);

    const labels = screen.getAllByRole("link").map((el) => el.textContent);
    expect(labels).toEqual(["First", "Second", "Third"]);
  });

  it("shows one group heading per group boundary, not once per item", () => {
    const navItems: SidebarNavItem[] = [
      { label: "Dashboard", path: "/admin/dashboard", icon: <HomeIcon />, navIndex: 0, group: "Overview" },
      { label: "Roles", path: "/admin/roles", icon: <HomeIcon />, navIndex: 1, group: "Platform" },
      { label: "Permissions", path: "/admin/permissions", icon: <HomeIcon />, navIndex: 2, group: "Platform" },
    ];
    renderSidebar(navItems);

    expect(screen.getAllByText("Overview")).toHaveLength(1);
    expect(screen.getAllByText("Platform")).toHaveLength(1);
  });

  it("renders an ungrouped item with no heading at all", () => {
    const navItems: SidebarNavItem[] = [{ label: "Dashboard", path: "/admin/dashboard", icon: <HomeIcon />, navIndex: 0 }];
    renderSidebar(navItems);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("shows a placeholder message when there are no nav items (non-admin roles today)", () => {
    renderSidebar([]);

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("hides labels but keeps icons and tooltips when collapsed to a rail", async () => {
    const user = userEvent.setup();
    const navItems: SidebarNavItem[] = [{ label: "Dashboard", path: "/admin/dashboard", icon: <HomeIcon />, navIndex: 0, end: true }];
    renderSidebar(navItems, { collapsed: true });

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    const link = screen.getByRole("link");
    await user.hover(link);
    expect(await screen.findByText("Dashboard")).toBeInTheDocument(); // the tooltip itself
  });

  it("on mobile, clicking a nav item closes the drawer via onMobileClose", async () => {
    const user = userEvent.setup();
    const onMobileClose = vi.fn();
    const navItems: SidebarNavItem[] = [{ label: "Bookings", path: "/admin/bookings", icon: <HomeIcon /> }];
    renderSidebar(navItems, { isMobile: true, mobileOpen: true, onMobileClose });

    await user.click(screen.getByRole("link", { name: "Bookings" }));

    expect(onMobileClose).toHaveBeenCalledTimes(1);
  });
});
