import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthService } from "../../../services/useAuthService";
import ResetPasswordPage from "./ResetPassword.page";

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
    forgotPassword: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue("Password reset successfully."),
    ...overrides,
  };
  mockedUseAuthService.mockReturnValue(authService);
  return authService;
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Role picker</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ResetPassword.page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("warns and blocks submission when there's no token in the URL", async () => {
    const user = userEvent.setup();
    const authService = mockAuthService();
    renderAt("/reset-password");

    expect(screen.getByText(/No reset token found in the URL/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^New Password/), "strongpass123");
    await user.type(screen.getByLabelText(/^Confirm New Password/), "strongpass123");
    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(await screen.findByText(/This reset link is missing its token/)).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it("blocks submission when the two passwords don't match", async () => {
    const user = userEvent.setup();
    const authService = mockAuthService();
    renderAt("/reset-password?token=real-token-123");

    await user.type(screen.getByLabelText(/^New Password/), "strongpass123");
    await user.type(screen.getByLabelText(/^Confirm New Password/), "differentpass456");
    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it("blocks submission when the new password is under 8 characters", async () => {
    const user = userEvent.setup();
    const authService = mockAuthService();
    renderAt("/reset-password?token=real-token-123");

    await user.type(screen.getByLabelText(/^New Password/), "short");
    await user.type(screen.getByLabelText(/^Confirm New Password/), "short");
    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(await screen.findByText("Password must be at least 8 characters long.")).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it("resets the password with the token from the URL and navigates to /login", async () => {
    const user = userEvent.setup();
    const authService = mockAuthService();
    renderAt("/reset-password?token=real-token-123");

    await user.type(screen.getByLabelText(/^New Password/), "strongpass123");
    await user.type(screen.getByLabelText(/^Confirm New Password/), "strongpass123");
    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => expect(authService.resetPassword).toHaveBeenCalledWith("real-token-123", "strongpass123"));
    expect(await screen.findByText("Role picker")).toBeInTheDocument();
  });

  it("shows the backend's error message when the reset itself fails", async () => {
    const user = userEvent.setup();
    mockAuthService({ resetPassword: vi.fn().mockRejectedValue({ response: { data: { message: "Invalid or expired reset token." } } }) });
    renderAt("/reset-password?token=expired-token");

    await user.type(screen.getByLabelText(/^New Password/), "strongpass123");
    await user.type(screen.getByLabelText(/^Confirm New Password/), "strongpass123");
    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(await screen.findByText("Invalid or expired reset token.")).toBeInTheDocument();
  });
});
