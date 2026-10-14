import React, { useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from "@mui/material";
import AuthCard from "./AuthCard";
import { useAuthService } from "../../../services/useAuthService";
import { getErrorMessage } from "../../../utils/helper";

const ResetPasswordPage: React.FC = () => {
  const authService = useAuthService();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    // Matches the backend's own MIN_PASSWORD_LENGTH (AuthServiceImpl#resetPassword) exactly.
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      navigate("/login", { state: { passwordReset: true } });
    } catch (err) {
      setError(getErrorMessage(err, "Could not reset your password. The link may have expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Reset your password" subtitle="Choose a new password for your account.">
      {!token && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No reset token found in the URL. Please use the link from your email.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack component="form" spacing={2} onSubmit={handleSubmit}>
        <TextField
          label="New Password"
          type="password"
          required
          fullWidth
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          label="Confirm New Password"
          type="password"
          required
          fullWidth
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? "Resetting…" : "Reset Password"}
        </Button>
      </Stack>
      <Typography variant="body2" textAlign="center" mt={3}>
        Remembered it after all?{" "}
        <MuiLink component={RouterLink} to="/login" fontWeight={700}>
          Head back to log in
        </MuiLink>
      </Typography>
    </AuthCard>
  );
};

export default ResetPasswordPage;
