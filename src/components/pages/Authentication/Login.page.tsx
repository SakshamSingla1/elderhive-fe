import React from "react";
import { Link as RouterLink, useLocation, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import { FiArrowRight } from "react-icons/fi";
import { MdAdminPanelSettings, MdElderly, MdFamilyRestroom, MdSecurity, MdVolunteerActivism } from "react-icons/md";
import { UserTypeEnum } from "../../../utils/enums";
import { loginPathForUserType } from "../../../routes/ProtectedRoute";

interface RoleOption {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    key: "family",
    label: "Family Member",
    description: "Manage care for your loved ones",
    icon: <MdFamilyRestroom size={32} />,
    to: loginPathForUserType(UserTypeEnum.FAMILY_MEMBER),
  },
  {
    key: "caretaker",
    label: "Caretaker",
    description: "Manage your bookings and schedule",
    icon: <MdVolunteerActivism size={32} />,
    to: loginPathForUserType(UserTypeEnum.CARETAKER),
  },
  {
    key: "elder",
    label: "Elder",
    description: "View your care and bookings",
    icon: <MdElderly size={32} />,
    to: loginPathForUserType(UserTypeEnum.ELDER),
  },
  {
    key: "admin",
    label: "Admin",
    description: "Manage the platform",
    icon: <MdAdminPanelSettings size={32} />,
    to: loginPathForUserType(UserTypeEnum.ADMIN),
  },
  {
    key: "super-admin",
    label: "Super Admin",
    description: "Full platform access",
    icon: <MdSecurity size={32} />,
    to: loginPathForUserType(UserTypeEnum.SUPER_ADMIN),
  },
];

// Role-picker landing page — the front door every "log in" link in the app points at:
// ProtectedRoute's unauthenticated redirect, the session-expired redirect in
// services/index.ts (?auth=expired), and the post-registration/post-reset redirects
// (Prompt 33's Register/ResetPassword pages, via location state) all send an
// unauthenticated visitor here first so they can choose which portal is theirs.
const LoginPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered);
  const passwordReset = Boolean((location.state as { passwordReset?: boolean } | null)?.passwordReset);
  const expired = searchParams.get("auth") === "expired";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", p: { xs: 2, sm: 4, md: 6 } }}>
      <Box sx={{ width: "100%", maxWidth: 720, my: "auto" }}>
        <Stack alignItems="center" textAlign="center" spacing={1.5} mb={4}>
          <Typography variant="h4" component="h1" fontWeight={800}>
            Choose your login
          </Typography>
          <Typography variant="body1" color="text.secondary" maxWidth={480}>
            Every ElderHive role has its own portal. Pick the one that's yours to continue.
          </Typography>
        </Stack>

        {registered && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Account created! Choose your role below to sign in.
          </Alert>
        )}
        {passwordReset && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Password reset! Choose your role below to sign in.
          </Alert>
        )}
        {expired && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Your session has expired. Choose your role below to sign in again.
          </Alert>
        )}

        <Stack spacing={2}>
          {ROLE_OPTIONS.map((option) => (
            <Card key={option.key} variant="outlined">
              <CardActionArea component={RouterLink} to={option.to} sx={{ p: 1 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ display: "flex", color: "primary.main" }}>{option.icon}</Box>
                    <Box flex={1}>
                      <Typography variant="h6" component="h2" fontWeight={700}>
                        {option.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", color: "action.active" }}>
                      <FiArrowRight />
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>

        <Typography variant="body2" textAlign="center" mt={4}>
          Don't have an account?{" "}
          <MuiLink component={RouterLink} to="/register" fontWeight={700}>
            Sign up
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
