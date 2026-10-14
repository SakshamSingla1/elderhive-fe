import React from "react";
import RoleLoginPage from "./RoleLoginPage";
import { UserTypeEnum } from "../../../utils/enums";

// ADMIN-only — unlike ElderSphere's legacy AdminLogin page (which used to admit both
// ADMIN and SUPER_ADMIN before SuperAdminLogin.page.tsx got its own dedicated portal),
// this one is built on RoleLoginPage like every other role from the start, consistent
// with "every role has its own single-role login page". No signup link: the backend's
// AuthServiceImpl#register rejects ADMIN self-registration with INVALID_ROLE.
const AdminLoginPage: React.FC = () => (
  <RoleLoginPage
    allowedUserType={UserTypeEnum.ADMIN}
    variant="admin"
    title="Administrator Access"
    subtitle="Sign in with your administrator credentials."
    roleLabel="administrator"
    showSignup={false}
  />
);

export default AdminLoginPage;
