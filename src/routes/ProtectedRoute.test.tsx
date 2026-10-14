import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { UserTypeEnum } from "../utils/enums";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";
import ProtectedRoute, { homePathForUser, loginPathForUserType } from "./ProtectedRoute";

vi.mock("../contexts/AuthenticatedUserContext", () => ({
  useAuthenticatedUser: vi.fn(),
}));

const mockedUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);

function renderGuarded(allowedUserTypes?: UserTypeEnum[]) {
  render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedUserTypes={allowedUserTypes}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
        <Route path="/elder/dashboard" element={<div>Elder dashboard</div>} />
        <Route path="/caretaker/dashboard" element={<div>Caretaker dashboard</div>} />
        <Route path="/family/dashboard" element={<div>Family dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function mockUser(primaryRole: UserTypeEnum | null) {
  mockedUseAuthenticatedUser.mockReturnValue({
    user: primaryRole
      ? { id: 1, email: "x@example.com", userType: primaryRole, primaryRole, roles: [primaryRole] }
      : null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshFromServer: vi.fn(),
  });
}

describe("ProtectedRoute", () => {
  it("redirects to /login when there is no authenticated user", () => {
    mockUser(null);

    renderGuarded();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected content when there is a user and no allowedUserTypes restriction", () => {
    mockUser(UserTypeEnum.ELDER);

    renderGuarded();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders the protected content when the user's primaryRole is in allowedUserTypes", () => {
    mockUser(UserTypeEnum.ADMIN);

    renderGuarded([UserTypeEnum.ADMIN, UserTypeEnum.SUPER_ADMIN]);

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to the user's own dashboard home when their primaryRole is not allowed here", () => {
    mockUser(UserTypeEnum.ELDER);

    renderGuarded([UserTypeEnum.ADMIN, UserTypeEnum.SUPER_ADMIN]);

    expect(screen.getByText("Elder dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it.each([
    [UserTypeEnum.SUPER_ADMIN, "/admin/dashboard"],
    [UserTypeEnum.ADMIN, "/admin/dashboard"],
    [UserTypeEnum.CARETAKER, "/caretaker/dashboard"],
    [UserTypeEnum.ELDER, "/elder/dashboard"],
    [UserTypeEnum.FAMILY_MEMBER, "/family/dashboard"],
  ])("homePathForUser(%s) -> %s", (userType, expectedPath) => {
    expect(homePathForUser(userType)).toBe(expectedPath);
  });

  it.each([
    [UserTypeEnum.SUPER_ADMIN, "/login/super-admin"],
    [UserTypeEnum.ADMIN, "/admin/login"],
    [UserTypeEnum.CARETAKER, "/login/caretaker"],
    [UserTypeEnum.ELDER, "/login/elder"],
    [UserTypeEnum.FAMILY_MEMBER, "/login/family"],
  ])("loginPathForUserType(%s) -> %s", (userType, expectedPath) => {
    expect(loginPathForUserType(userType)).toBe(expectedPath);
  });
});
