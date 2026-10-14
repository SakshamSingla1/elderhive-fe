import React from "react";
import RoleLoginPage from "./RoleLoginPage";
import { UserTypeEnum } from "../../../utils/enums";

const CaretakerLoginPage: React.FC = () => (
  <RoleLoginPage
    allowedUserType={UserTypeEnum.CARETAKER}
    variant="caretaker"
    title="Caretaker Login"
    subtitle="Sign in to manage your bookings and schedule."
    roleLabel="caretaker"
  />
);

export default CaretakerLoginPage;
