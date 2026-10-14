import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthenticatedUser } from "../contexts/AuthenticatedUserContext";
import { UserTypeEnum } from "../utils/enums";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: UserTypeEnum[];
}

// Guards an authenticated route group: redirects to /login when there's no session, and
// — when `allowedUserTypes` is supplied — redirects a logged-in user of the wrong role
// back to their own home rather than /login (they ARE authenticated, just in the wrong
// shell — e.g. an ELDER hitting a /admin/** route). Checked against `user.primaryRole`
// (Prompt 30's explicit alias of userType), not `user.roles`, since a shell is keyed off
// which portal the account is CURRENTLY in, not every role it happens to also hold.
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedUserTypes }) => {
  const { user } = useAuthenticatedUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedUserTypes && !allowedUserTypes.includes(user.primaryRole)) {
    return <Navigate to={homePathForUser(user.primaryRole)} replace />;
  }

  return <>{children}</>;
};

// SUPER_ADMIN and ADMIN share the same admin shell/dashboard (AdminRoutes serves both,
// see IMPLEMENTATION_PLAN.md Prompt 33) — only their LOGIN pages differ, see
// loginPathForUserType below.
export const homePathForUser = (userType: UserTypeEnum): string => {
  switch (userType) {
    case UserTypeEnum.SUPER_ADMIN:
    case UserTypeEnum.ADMIN:
      return "/admin/dashboard";
    case UserTypeEnum.CARETAKER:
      return "/caretaker/dashboard";
    case UserTypeEnum.ELDER:
      return "/elder/dashboard";
    case UserTypeEnum.FAMILY_MEMBER:
    default:
      return "/family/dashboard";
  }
};

// The dedicated login page for a given role (Prompt 32's five role-specific login pages:
// AdminLogin, SuperAdminLogin, ElderLogin, CaretakerLogin, FamilyLogin) — used by the
// role-picker Login page's links and by Register.page.tsx to send a freshly-registered
// user to the right place to sign in.
export const loginPathForUserType = (userType: UserTypeEnum): string => {
  switch (userType) {
    case UserTypeEnum.SUPER_ADMIN:
      return "/login/super-admin";
    case UserTypeEnum.ADMIN:
      return "/admin/login";
    case UserTypeEnum.CARETAKER:
      return "/login/caretaker";
    case UserTypeEnum.ELDER:
      return "/login/elder";
    case UserTypeEnum.FAMILY_MEMBER:
    default:
      return "/login/family";
  }
};

export default ProtectedRoute;
