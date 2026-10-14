import React from "react";
import RoleLoginPage from "./RoleLoginPage";
import { UserTypeEnum } from "../../../utils/enums";

const ElderLoginPage: React.FC = () => (
  <RoleLoginPage
    allowedUserType={UserTypeEnum.ELDER}
    variant="elder"
    title="Elder Login"
    subtitle="Sign in to view your care and bookings."
    roleLabel="elder"
  />
);

export default ElderLoginPage;
