import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthService } from "../../../services/useAuthService";
import ForgotPasswordPage from "./ForgotPassword.page";

vi.mock("../../../services/useAuthService", () => ({
  useAuthService: vi.fn(),
}));

const mockedUseAuthService = vi.mocked(useAuthService);

function mockAuthService(overrides: Partial<ReturnType<typeof useAuthService>> = {}) {
  const authService = {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    forgotPassword: vi.fn().mockResolvedValue("If an account with that email exists, a password reset link has been sent."),
    resetPassword: vi.fn(),
    ...overrides,
  };
  mockedUseAuthService.mockReturnValue(authService);
  return authService;
}

describe("ForgotPassword.page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the email and shows the generic success message", async () => {
    const user = userEvent.setup();
    const authService = mockAuthService();
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^Email/), "elder@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(await screen.findByText(/If an account exists for elder@example.com/)).toBeInTheDocument();
    expect(authService.forgotPassword).toHaveBeenCalledWith("elder@example.com");
  });

  it("shows the backend's error message on failure, without claiming success", async () => {
    const user = userEvent.setup();
    mockAuthService({ forgotPassword: vi.fn().mockRejectedValue(new Error("Network Error")) });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^Email/), "elder@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(await screen.findByText("Network Error")).toBeInTheDocument();
    expect(screen.queryByText(/password reset link has been sent/)).not.toBeInTheDocument();
  });
});
