import React from "react";
import RoleLoginPage from "./RoleLoginPage";
import { UserTypeEnum } from "../../../utils/enums";

// SUPER_ADMIN's own dedicated portal, separate from /admin/login — no self-registration
// (same reasoning as AdminLoginPage).
const SuperAdminLoginPage: React.FC = () => (
  <RoleLoginPage
    allowedUserType={UserTypeEnum.SUPER_ADMIN}
    variant="super-admin"
    title="Super Admin Access"
    subtitle="Sign in with your super administrator credentials."
    roleLabel="super administrator"
    showSignup={false}
  />
);

export default SuperAdminLoginPage;
