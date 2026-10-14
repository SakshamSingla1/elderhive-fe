import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Alert, Box, Button, Link as MuiLink, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import ElderlyIcon from "@mui/icons-material/Elderly";
import AuthCard from "./AuthCard";
import { useAuthService } from "../../../services/useAuthService";
import { UserTypeEnum } from "../../../utils/enums";
import { getErrorMessage } from "../../../utils/helper";
import { loginPathForUserType } from "../../../routes/ProtectedRoute";

// Only these three self-register — ADMIN/SUPER_ADMIN are provisioned, never self-service
// (the backend's own AuthServiceImpl#register rejects either with INVALID_ROLE, so this
// union exists purely to keep that constraint visible/enforced on the frontend too).
type SelfRegisterableUserType = typeof UserTypeEnum.FAMILY_MEMBER | typeof UserTypeEnum.CARETAKER | typeof UserTypeEnum.ELDER;

const SELF_REGISTERABLE_OPTIONS: Array<{ userType: SelfRegisterableUserType; label: string; icon: React.ReactNode }> = [
  { userType: UserTypeEnum.FAMILY_MEMBER, label: "Family Member", icon: <FamilyRestroomIcon fontSize="small" /> },
  { userType: UserTypeEnum.CARETAKER, label: "Caretaker", icon: <VolunteerActivismIcon fontSize="small" /> },
  { userType: UserTypeEnum.ELDER, label: "Elder", icon: <ElderlyIcon fontSize="small" /> },
];

interface RegisterFormValues {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const validationSchema = Yup.object({
  fullName: Yup.string().required("Full name is required"),
  email: Yup.string().email("Enter a valid email address").required("Email is required"),
  phone: Yup.string().optional(),
  // Matches the backend's own MIN_PASSWORD_LENGTH (AuthServiceImpl) exactly — no extra
  // complexity rules invented here that the server doesn't actually enforce.
  password: Yup.string().required("Password is required").min(8, "Password must be at least 8 characters."),
});

const RegisterPage: React.FC = () => {
  const authService = useAuthService();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<SelfRegisterableUserType>(UserTypeEnum.FAMILY_MEMBER);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik<RegisterFormValues>({
    initialValues: { fullName: "", email: "", phone: "", password: "" },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setError(null);
      try {
        await authService.register({ ...values, userType });
        // Register already collects the role, so send them straight to that role's own
        // dedicated login page (rather than the generic /login picker) for a smoother flow.
        navigate(loginPathForUserType(userType), { state: { registered: true } });
      } catch (err) {
        setError(getErrorMessage(err, "Could not create your account. Please try again."));
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <AuthCard title="Create your account" subtitle="Join ElderHive as a family member, caretaker, or elder.">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box mb={2}>
        <Typography variant="body2" fontWeight={600} mb={1}>
          I am signing up as a...
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={userType}
          onChange={(_, value: SelfRegisterableUserType | null) => value && setUserType(value)}
          color="primary"
        >
          {SELF_REGISTERABLE_OPTIONS.map((option) => (
            <ToggleButton key={option.userType} value={option.userType} sx={{ py: 1.5, gap: 1 }}>
              {option.icon} {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Stack component="form" spacing={2} onSubmit={formik.handleSubmit}>
        <TextField
          label="Full Name"
          name="fullName"
          required
          fullWidth
          value={formik.values.fullName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.fullName && Boolean(formik.errors.fullName)}
          helperText={formik.touched.fullName && formik.errors.fullName}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          required
          fullWidth
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
        />
        <TextField
          label="Phone"
          name="phone"
          fullWidth
          value={formik.values.phone}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.phone && Boolean(formik.errors.phone)}
          helperText={formik.touched.phone && formik.errors.phone}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          required
          fullWidth
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={(formik.touched.password && formik.errors.password) || "At least 8 characters."}
        />
        <Button type="submit" variant="contained" size="large" disabled={formik.isSubmitting}>
          {formik.isSubmitting ? "Creating account…" : "Create Account"}
        </Button>
      </Stack>
      <Typography variant="body2" textAlign="center" mt={3}>
        Already have an account?{" "}
        <MuiLink component={RouterLink} to={loginPathForUserType(userType)} fontWeight={700}>
          Log in
        </MuiLink>
      </Typography>
    </AuthCard>
  );
};

export default RegisterPage;
