import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { useColorThemeService } from "../../../services/useColorThemeService";
import { useUserThemeService } from "../../../services/useUserThemeService";
import { UserTypeEnum } from "../../../utils/enums";
import type { ColorThemeResponse } from "../../../services/useColorThemeService";
import ColorThemeListingTemplate from "./ColorThemeListing.template";

vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));
vi.mock("../../../contexts/ThemeContext", async () => {
  const actual = await vi.importActual<typeof import("../../../contexts/ThemeContext")>("../../../contexts/ThemeContext");
  return { ...actual, useTheme: vi.fn() };
});
vi.mock("../../../services/useColorThemeService", async () => {
  const actual = await vi.importActual<typeof import("../../../services/useColorThemeService")>("../../../services/useColorThemeService");
  return { ...actual, useColorThemeService: vi.fn() };
});
vi.mock("../../../services/useUserThemeService", () => ({
  useUserThemeService: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);
const mockedUseTheme = vi.mocked(useTheme);
const mockedUseColorThemeService = vi.mocked(useColorThemeService);
const mockedUseUserThemeService = vi.mocked(useUserThemeService);

function theme(id: number, themeName: string): ColorThemeResponse {
  return {
    id,
    themeName,
    status: "ACTIVE",
    palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#2E7D32" }] }] },
  };
}

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

function mockColorThemeService(deleteColorTheme = vi.fn()) {
  mockedUseColorThemeService.mockReturnValue({
    getColorTheme: vi.fn(),
    getColorThemeById: vi.fn(),
    createColorTheme: vi.fn(),
    updateColorTheme: vi.fn(),
    deleteColorTheme,
  });
}

function renderListing(props: Partial<React.ComponentProps<typeof ColorThemeListingTemplate>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/color-themes"]}>
      <Routes>
        <Route
          path="/admin/color-themes"
          element={
            <ColorThemeListingTemplate
              colorThemes={props.colorThemes ?? [theme(1, "Forest Green"), theme(2, "Ocean Blue")]}
              page={props.page ?? 0}
              totalPages={props.totalPages ?? 1}
              onPageChange={props.onPageChange ?? vi.fn()}
              onRefresh={props.onRefresh}
              isLoading={props.isLoading ?? false}
            />
          }
        />
        <Route path="/admin/color-themes/new" element={<div>add theme page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ColorThemeListingTemplate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a card per theme", () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing();

    expect(screen.getByText("Forest Green")).toBeInTheDocument();
    expect(screen.getByText("Ocean Blue")).toBeInTheDocument();
  });

  it("shows a skeleton grid while loading, not the themes or the empty state", () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing({ isLoading: true, colorThemes: [] });

    expect(screen.queryByText("Forest Green")).not.toBeInTheDocument();
    expect(screen.queryByText("No color themes found")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no themes and not loading", () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing({ colorThemes: [] });

    expect(screen.getByText("No color themes found")).toBeInTheDocument();
  });

  it("shows the Active Injection banner with a working Reset button only while a preview is active", async () => {
    const user = userEvent.setup();
    const resetTheme = vi.fn();
    mockUser(UserTypeEnum.ELDER);
    mockTheme({ isPreviewActive: true, activeThemeName: "Ocean Blue", resetTheme });
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing();

    const banner = screen.getByRole("alert");
    expect(within(banner).getByText(/Active Injection:/)).toBeInTheDocument();
    expect(within(banner).getByText("Ocean Blue")).toBeInTheDocument();
    await user.click(within(banner).getByRole("button", { name: "Reset" }));
    expect(resetTheme).toHaveBeenCalledTimes(1);
  });

  it("hides the banner when no preview is active", () => {
    mockUser(UserTypeEnum.ELDER);
    mockTheme({ isPreviewActive: false });
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing();

    expect(screen.queryByText(/Active Injection:/)).not.toBeInTheDocument();
  });

  it("hides Add Theme for a non-SUPER_ADMIN viewer, shows and navigates for a SUPER_ADMIN", async () => {
    const user = userEvent.setup();
    mockUser(UserTypeEnum.ADMIN);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    const { rerender } = render(
      <MemoryRouter initialEntries={["/admin/color-themes"]}>
        <Routes>
          <Route
            path="/admin/color-themes"
            element={<ColorThemeListingTemplate colorThemes={[theme(1, "Forest Green")]} page={0} totalPages={1} onPageChange={vi.fn()} />}
          />
          <Route path="/admin/color-themes/new" element={<div>add theme page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByRole("button", { name: "Add Theme" })).not.toBeInTheDocument();

    mockUser(UserTypeEnum.SUPER_ADMIN);
    rerender(
      <MemoryRouter initialEntries={["/admin/color-themes"]}>
        <Routes>
          <Route
            path="/admin/color-themes"
            element={<ColorThemeListingTemplate colorThemes={[theme(1, "Forest Green")]} page={0} totalPages={1} onPageChange={vi.fn()} />}
          />
          <Route path="/admin/color-themes/new" element={<div>add theme page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole("button", { name: "Add Theme" }));
    expect(await screen.findByText("add theme page")).toBeInTheDocument();
  });

  it("shows pagination only when there's more than one page, and calls onPageChange with a 0-based page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    mockUser(UserTypeEnum.ELDER);
    mockTheme();
    mockColorThemeService();
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing({ page: 0, totalPages: 3, onPageChange });

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("deleting a theme shows a confirmation dialog, calls deleteColorTheme, and refreshes on success", async () => {
    const user = userEvent.setup();
    const deleteColorTheme = vi.fn().mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    mockUser(UserTypeEnum.SUPER_ADMIN);
    mockTheme();
    mockColorThemeService(deleteColorTheme);
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing({ onRefresh });

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[0]);

    expect(screen.getByText("Delete this theme?")).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteColorTheme).toHaveBeenCalledWith(1));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Theme deleted")).toBeInTheDocument();
  });

  it("Cancel in the confirmation dialog never calls deleteColorTheme", async () => {
    const user = userEvent.setup();
    const deleteColorTheme = vi.fn();
    mockUser(UserTypeEnum.SUPER_ADMIN);
    mockTheme();
    mockColorThemeService(deleteColorTheme);
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing();

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // MUI Dialog unmounts after its close transition, not synchronously on click.
    await waitFor(() => expect(screen.queryByText("Delete this theme?")).not.toBeInTheDocument());
    expect(deleteColorTheme).not.toHaveBeenCalled();
  });

  it("shows an error message if deletion fails", async () => {
    const user = userEvent.setup();
    mockUser(UserTypeEnum.SUPER_ADMIN);
    mockTheme();
    mockColorThemeService(vi.fn().mockRejectedValue(new Error("boom")));
    mockedUseUserThemeService.mockReturnValue({ getActiveTheme: vi.fn(), setActiveTheme: vi.fn(), resetTheme: vi.fn(), getUsersByTheme: vi.fn(), countUsersByTheme: vi.fn() });

    renderListing();

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
