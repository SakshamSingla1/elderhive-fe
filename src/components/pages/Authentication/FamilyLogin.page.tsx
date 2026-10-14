import React from "react";
import RoleLoginPage from "./RoleLoginPage";
import { UserTypeEnum } from "../../../utils/enums";

const FamilyLoginPage: React.FC = () => (
  <RoleLoginPage
    allowedUserType={UserTypeEnum.FAMILY_MEMBER}
    variant="family"
    title="Family Login"
    subtitle="Sign in to manage bookings and care for your loved ones."
    roleLabel="family member"
  />
);

export default FamilyLoginPage;
