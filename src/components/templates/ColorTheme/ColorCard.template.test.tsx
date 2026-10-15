import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useUserThemeService } from "../../../services/useUserThemeService";
import { UserTypeEnum } from "../../../utils/enums";
import type { ColorThemeResponse } from "../../../services/useColorThemeService";
import ColorCard from "./ColorCard.template";

vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));
vi.mock("../../../contexts/ThemeContext", async () => {
  const actual = await vi.importActual<typeof import("../../../contexts/ThemeContext")>("../../../contexts/ThemeContext");
  return { ...actual, useTheme: vi.fn() };
});
vi.mock("../../../services/useUserThemeService", () => ({
  useUserThemeService: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);
const mockedUseTheme = vi.mocked(useTheme);
const mockedUseUserThemeService = vi.mocked(useUserThemeService);

const sampleTheme: ColorThemeResponse = {
  id: 7,
  themeName: "Forest Green",
  status: "ACTIVE",
  palette: {
    colorGroups: [
      {
        groupName: "primary",
        colorShades: [
          { colorName: "primary50", colorCode: "#E8F5E9" },
          { colorName: "primary500", colorCode: "#2E7D32" },
        ],
      },
      { groupName: "neutral", colorShades: [{ colorName: "neutral500", colorCode: "#808080" }] },
    ],
  },
};

function mockUser(primaryRole: (typeof UserTypeEnum)[keyof typeof UserTypeEnum]) {
  mockedUseAuthenticatedUser.mockReturnValue({
    user: { id: 1, email: "a@example.com", userType: primaryRole, primaryRole, roles: [primaryRole] },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
}

function mockTheme(overrides: Partial<ReturnType<typeof useTheme>> = {}) {
  mockedUseTheme.mockReturnValue({
    isDark: false,
    isPreviewActive: false,
    activeThemeName: "Default",
    activeColorTheme: null,
    setColorMode: vi.fn(),
    setActiveTheme: vi.fn(),
    resetTheme: vi.fn(),
    ...overrides,
  });
}

function renderCard(onDelete?: (id: number) => void) {
  return render(
    <MemoryRouter initialEntries={["/admin/color-themes"]}>
      <Routes>
        <Route path="/admin/color-themes" element={<ColorCard colorTheme={sampleTheme} onDelete={onDelete} />} />
        <Route path="/admin/color-themes/:id" element={<div>view page</div>} />
        <Route path="/admin/color-themes/:id/edit" element={<div>edit page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ColorCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the theme name and group/shade counts", () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    renderCard();

    expect(screen.getByText("Forest Green")).toBeInTheDocument();
    expect(screen.getByText("2 groups · 2 shades each")).toBeInTheDocument();
  });

  it("shows an Active chip when this is the user's persisted active theme", () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme({ activeColorTheme: sampleTheme });
    renderCard();

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows an Active chip when this theme is mid-preview, even without a matching persisted theme", () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme({ isPreviewActive: true, activeThemeName: "Forest Green", activeColorTheme: null });
    renderCard();

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows no Active chip for an unrelated theme", () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme({ activeColorTheme: { ...sampleTheme, id: 99 } });
    renderCard();

    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("View is available to every authenticated role and navigates to the theme's view page", async () => {
    const user = userEvent.setup();
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    renderCard();

    await user.click(screen.getByRole("button", { name: "View" }));
    expect(await screen.findByText("view page")).toBeInTheDocument();
  });

  it("hides Edit and Delete entirely for a non-SUPER_ADMIN viewer", () => {
    mockUser(UserTypeEnum.ADMIN);
    mockTheme();
    renderCard(vi.fn());

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows Edit and Delete for a SUPER_ADMIN, navigating/calling onDelete correctly", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    mockUser(UserTypeEnum.SUPER_ADMIN);
    mockTheme();
    renderCard(onDelete);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(7);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(await screen.findByText("edit page")).toBeInTheDocument();
  });

  it("clicking a swatch copies its hex to the clipboard and shows a brief checkmark", async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own navigator.clipboard stub (for paste support),
    // which clobbers anything defined before it - so the spy must be installed after.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    renderCard();

    await user.click(screen.getByRole("button", { name: /Copy primary500 \(#2E7D32\)/ }));

    expect(writeText).toHaveBeenCalledWith("#2E7D32");
    await waitFor(() => expect(screen.getByRole("button", { name: /Copy primary500/ })).toContainHTML("svg"));
  });

  it("Apply (when not active) previews instantly and persists via useUserThemeService", async () => {
    const user = userEvent.setup();
    const setActiveTheme = vi.fn();
    const setThemeOnServer = vi.fn().mockResolvedValue(undefined);
    mockedUseUserThemeService.mockReturnValue({
      getActiveTheme: vi.fn(),
      setActiveTheme: setThemeOnServer,
      resetTheme: vi.fn(),
      getUsersByTheme: vi.fn(),
      countUsersByTheme: vi.fn(),
    });
    mockUser(UserTypeEnum.ELDER);
    mockTheme({ setActiveTheme });
    renderCard();

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(setActiveTheme).toHaveBeenCalledWith("Forest Green", expect.objectContaining({ primary: expect.any(String), accent: expect.any(String) }));
    await waitFor(() => expect(setThemeOnServer).toHaveBeenCalledWith(7));
  });

  it("Apply (when already active) resets instead of re-applying", async () => {
    const user = userEvent.setup();
    const resetTheme = vi.fn();
    const setActiveTheme = vi.fn();
    const setThemeOnServer = vi.fn();
    mockedUseUserThemeService.mockReturnValue({
      getActiveTheme: vi.fn(),
      setActiveTheme: setThemeOnServer,
      resetTheme: vi.fn(),
      getUsersByTheme: vi.fn(),
      countUsersByTheme: vi.fn(),
    });
    mockUser(UserTypeEnum.ELDER);
    mockTheme({ activeColorTheme: sampleTheme, resetTheme, setActiveTheme });
    renderCard();

    await user.click(screen.getByRole("button", { name: "Applied" }));

    expect(resetTheme).toHaveBeenCalledTimes(1);
    expect(setActiveTheme).not.toHaveBeenCalled();
    expect(setThemeOnServer).not.toHaveBeenCalled();
  });

  it("shows an error if persisting the applied theme fails", async () => {
    const user = userEvent.setup();
    mockedUseUserThemeService.mockReturnValue({
      getActiveTheme: vi.fn(),
      setActiveTheme: vi.fn().mockRejectedValue(new Error("network error")),
      resetTheme: vi.fn(),
      getUsersByTheme: vi.fn(),
      countUsersByTheme: vi.fn(),
    });
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("network error")).toBeInTheDocument();
  });
});
