import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from "@mui/material";
import AuthCard from "./AuthCard";
import { useAuthService } from "../../../services/useAuthService";
import { getErrorMessage } from "../../../utils/helper";

const ForgotPasswordPage: React.FC = () => {
  const authService = useAuthService();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Always succeeds and returns the same generic message whether or not the email
      // is registered (see AuthServiceImpl#forgotPassword) — never leaks which emails
      // have accounts, so there's nothing to branch on here besides a network/server
      // failure.
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send the reset link. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {sent ? (
        <Alert severity="success">If an account exists for {email}, a password reset link has been sent.</Alert>
      ) : (
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </Button>
        </Stack>
      )}
      <Typography variant="body2" textAlign="center" mt={3}>
        <MuiLink component={RouterLink} to="/login" fontWeight={700}>
          Back to log in
        </MuiLink>
      </Typography>
    </AuthCard>
  );
};

export default ForgotPasswordPage;
