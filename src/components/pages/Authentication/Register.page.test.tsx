import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserTypeEnum } from "../../../utils/enums";
import { useAuthService } from "../../../services/useAuthService";
import RegisterPage from "./Register.page";

vi.mock("../../../services/useAuthService", () => ({
  useAuthService: vi.fn(),
}));

const mockedUseAuthService = vi.mocked(useAuthService);

function mockAuthService(overrides: Partial<ReturnType<typeof useAuthService>> = {}) {
  const authService = {
    register: vi.fn().mockResolvedValue({ id: 1, email: "x@example.com", fullName: "X", userType: UserTypeEnum.FAMILY_MEMBER, status: "ACTIVE" }),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    ...overrides,
  };
  mockedUseAuthService.mockReturnValue(authService);
  return authService;
}

function renderRegisterPage() {
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login/family" element={<div>Family login page</div>} />
        <Route path="/login/caretaker" element={<div>Caretaker login page</div>} />
        <Route path="/login/elder" element={<div>Elder login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Register.page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a Yup validation error for each required field once it's blurred empty", async () => {
    const user = userEvent.setup();
    const authService = mockAuthService();
    renderRegisterPage();

    // Tab through every required field without typing anything, so each blurs empty -
    // doesn't depend on exactly which fields Formik's own submit handler happens to mark
    // touched, just the per-field onBlur validation this form actually relies on.
    await user.click(screen.getByLabelText(/^Full Name/));
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();

    expect(await screen.findByText("Full name is required")).toBeInTheDocument();
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it("shows an email-format error for an invalid address", async () => {
    const user = userEvent.setup();
    mockAuthService();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/^Email/), "not-an-email");
    await user.tab();

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
  });

  it("shows a min-length error for a password under 8 characters", async () => {
    const user = userEvent.setup();
    mockAuthService();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/^Password/), "short");
    await user.tab();

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("registers with the selected role and navigates to that role's own login page", async () => {
    const user = userEvent.setup();
    const authService = mockAuthService();
    renderRegisterPage();

    await user.click(screen.getByRole("button", { name: /Caretaker/ }));
    await user.type(screen.getByLabelText(/^Full Name/), "Test Caretaker");
    await user.type(screen.getByLabelText(/^Email/), "caretaker@example.com");
    await user.type(screen.getByLabelText(/^Phone/), "9000000000");
    await user.type(screen.getByLabelText(/^Password/), "strongpass123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() =>
      expect(authService.register).toHaveBeenCalledWith({
        fullName: "Test Caretaker",
        email: "caretaker@example.com",
        phone: "9000000000",
        password: "strongpass123",
        userType: UserTypeEnum.CARETAKER,
      })
    );
    expect(await screen.findByText("Caretaker login page")).toBeInTheDocument();
  });

  it("shows the backend's error message when registration fails", async () => {
    const user = userEvent.setup();
    mockAuthService({
      register: vi.fn().mockRejectedValue({ response: { data: { message: "An account with this email already exists." } } }),
    });
    renderRegisterPage();

    await user.type(screen.getByLabelText(/^Full Name/), "Test Elder");
    await user.type(screen.getByLabelText(/^Email/), "elder@example.com");
    await user.type(screen.getByLabelText(/^Password/), "strongpass123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
  });

  it("the Log in link follows the currently selected role", async () => {
    const user = userEvent.setup();
    mockAuthService();
    renderRegisterPage();

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login/family");

    await user.click(screen.getByRole("button", { name: /Elder/ }));

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login/elder");
  });
});
