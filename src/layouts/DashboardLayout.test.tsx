import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FiHome } from "react-icons/fi";
import { UserTypeEnum } from "../utils/enums";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";
import DashboardLayout, { type SidebarNavItem } from "./DashboardLayout";

vi.mock("../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

const STORAGE_KEY = "elderhive.sidebarCollapsed";

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function mockAuth(overrides: Partial<ReturnType<typeof useAuthenticatedUser>> = {}) {
  const auth = {
    user: { id: 1, email: "elder@example.com", userType: UserTypeEnum.ELDER, primaryRole: UserTypeEnum.ELDER, roles: [UserTypeEnum.ELDER] },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshFromServer: vi.fn(),
    ...overrides,
  };
  mockedUseAuthenticatedUser.mockReturnValue(auth);
  return auth;
}

const navItems: SidebarNavItem[] = [
  { label: "Dashboard", path: "/elder/dashboard", icon: <FiHome />, end: true },
  { label: "Bookings", path: "/elder/bookings", icon: <FiHome /> },
];

function renderLayout(initialPath = "/elder/dashboard") {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/elder" element={<DashboardLayout navItems={navItems} roleLabel="Elder" />}>
          <Route path="dashboard" element={<div>Dashboard content</div>} />
          <Route path="bookings" element={<div>Bookings content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("DashboardLayout", () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false); // desktop by default
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders every nav item and the current route's Outlet content", () => {
    mockAuth();
    renderLayout();

    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveAttribute("href", "/elder/dashboard");
    expect(screen.getByRole("link", { name: /Bookings/ })).toHaveAttribute("href", "/elder/bookings");
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("navigates and renders the new Outlet content when a nav item is clicked", async () => {
    const user = userEvent.setup();
    mockAuth();
    renderLayout();

    await user.click(screen.getByRole("link", { name: /Bookings/ }));

    expect(await screen.findByText("Bookings content")).toBeInTheDocument();
  });

  it("starts expanded by default and persists the collapsed state to localStorage when toggled", async () => {
    const user = userEvent.setup();
    mockAuth();
    renderLayout();

    // Expanded: nav item labels are visible text, not just icons.
    expect(screen.getByText("Dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBe("true"));
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("starts collapsed when localStorage already has the preference set", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    mockAuth();
    renderLayout();

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("shows a hamburger menu button on mobile instead of the collapse toggle", () => {
    mockMatchMedia(true); // mobile
    mockAuth();
    renderLayout();

    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse sidebar" })).not.toBeInTheDocument();
  });

  it("logs out and navigates to /login when Sign out is clicked", async () => {
    const user = userEvent.setup();
    const auth = mockAuth();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await user.click(await screen.findByText("Sign out"));

    await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
  });

  it("shows the logged-in user's email in the account menu", async () => {
    const user = userEvent.setup();
    mockAuth();
    renderLayout();

    await user.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(await screen.findByText("elder@example.com")).toBeInTheDocument();
  });
});
