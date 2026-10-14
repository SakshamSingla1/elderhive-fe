import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserTypeEnum } from "../../../utils/enums";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import RoleLoginPage from "./RoleLoginPage";

vi.mock("../../../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

function renderElderLoginAt(initialEntry: string | { pathname: string; state?: unknown } = "/login/elder") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/login/elder"
          element={
            <RoleLoginPage
              allowedUserType={UserTypeEnum.ELDER}
              variant="elder"
              title="Elder Login"
              subtitle="Sign in to view your care and bookings."
              roleLabel="elder"
            />
          }
        />
        <Route path="/elder/dashboard" element={<div>Elder dashboard</div>} />
        <Route path="/login" element={<div>Role picker</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function mockAuth(overrides: Partial<ReturnType<typeof useAuthenticatedUser>> = {}) {
  const auth = {
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshFromServer: vi.fn(),
    ...overrides,
  };
  mockedUseAuthenticatedUser.mockReturnValue(auth);
  return auth;
}

describe("RoleLoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates to the user's own dashboard on a successful login matching allowedUserType", async () => {
    const user = userEvent.setup();
    mockAuth({
      login: vi.fn().mockResolvedValue({
        id: 1,
        email: "elder@example.com",
        userType: UserTypeEnum.ELDER,
        primaryRole: UserTypeEnum.ELDER,
        roles: [UserTypeEnum.ELDER],
      }),
    });
    renderElderLoginAt();

    await user.type(screen.getByLabelText(/^Email/), "elder@example.com");
    await user.type(screen.getByLabelText(/^Password/), "strongpass123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(screen.getByText("Elder dashboard")).toBeInTheDocument());
  });

  it("logs out and shows a rejection message when the account's primaryRole doesn't match this portal", async () => {
    const user = userEvent.setup();
    const auth = mockAuth({
      login: vi.fn().mockResolvedValue({
        id: 1,
        email: "admin@example.com",
        userType: UserTypeEnum.ADMIN,
        primaryRole: UserTypeEnum.ADMIN,
        roles: [UserTypeEnum.ADMIN],
      }),
    });
    renderElderLoginAt();

    await user.type(screen.getByLabelText(/^Email/), "admin@example.com");
    await user.type(screen.getByLabelText(/^Password/), "strongpass123");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(screen.getByText(/This login is for elder accounts/)).toBeInTheDocument());
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Elder dashboard")).not.toBeInTheDocument();
  });

  it("shows the backend's error message when login itself fails", async () => {
    const user = userEvent.setup();
    mockAuth({
      login: vi.fn().mockRejectedValue({ response: { data: { message: "Invalid email or password." } } }),
    });
    renderElderLoginAt();

    await user.type(screen.getByLabelText(/^Email/), "elder@example.com");
    await user.type(screen.getByLabelText(/^Password/), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() => expect(screen.getByText("Invalid email or password.")).toBeInTheDocument());
  });

  it("shows a success banner when arriving with registered=true in location state", () => {
    mockAuth();
    renderElderLoginAt({ pathname: "/login/elder", state: { registered: true } });

    expect(screen.getByText(/Account created!/)).toBeInTheDocument();
  });

  it("hides the Sign up link when showSignup is false", () => {
    mockAuth();
    render(
      <MemoryRouter initialEntries={["/login/super-admin"]}>
        <Routes>
          <Route
            path="/login/super-admin"
            element={
              <RoleLoginPage
                allowedUserType={UserTypeEnum.SUPER_ADMIN}
                variant="super-admin"
                title="Super Admin Access"
                subtitle="Sign in with your super administrator credentials."
                roleLabel="super administrator"
                showSignup={false}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText("Sign up")).not.toBeInTheDocument();
  });
});
