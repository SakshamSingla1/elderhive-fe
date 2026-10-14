import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from "@mui/material";
import AuthCard, { type AuthCardVariant } from "./AuthCard";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { homePathForUser } from "../../../routes/ProtectedRoute";
import { getErrorMessage } from "../../../utils/helper";
import type { UserTypeEnum } from "../../../utils/enums";

export interface RoleLoginPageProps {
  /** The single role this dedicated portal admits. */
  allowedUserType: UserTypeEnum;
  variant: AuthCardVariant;
  title: string;
  subtitle: string;
  /** Lowercase noun used in the rejection/footer copy, e.g. "elder", "family member". */
  roleLabel: string;
  /** Register only offers Family/Caretaker/Elder — admin tiers don't self-register (the
   *  backend's own AuthServiceImpl#register rejects ADMIN/SUPER_ADMIN with INVALID_ROLE). */
  showSignup?: boolean;
}

// Shared form + gating logic for every single-role dedicated login page. Unlike
// ElderSphere's equivalent (which uses a separate useRoleGatedLogin hook to let an
// account holding the wanted role but not AS its current primary switch into it via
// PUT /users/me/default-role), ElderHive's backend has no such endpoint yet — so this
// checks the logged-in account's primaryRole directly (same field ProtectedRoute itself
// checks) and rejects anything else, even a role the account holds but isn't currently
// using, rather than attempting a switch that isn't possible yet.
const RoleLoginPage: React.FC<RoleLoginPageProps> = ({
  allowedUserType,
  variant,
  title,
  subtitle,
  roleLabel,
  showSignup = true,
}) => {
  const { login, logout } = useAuthenticatedUser();
  const navigate = useNavigate();
  const location = useLocation();
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setRejected(false);
    setLoading(true);
    try {
      const authenticatedUser = await login(email, password);
      if (authenticatedUser.primaryRole !== allowedUserType) {
        // Authenticated successfully, but at the wrong portal — don't leave the
        // session half-established here.
        await logout();
        setRejected(true);
        return;
      }
      navigate(homePathForUser(authenticatedUser.primaryRole));
    } catch (err) {
      setError(getErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard variant={variant} title={title} subtitle={subtitle}>
      {registered && !error && !rejected && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Account created! Sign in below to get started.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {rejected && (
        <Alert severity="error" sx={{ mb: 2 }}>
          This login is for {roleLabel} accounts.{" "}
          <MuiLink component={RouterLink} to="/login" fontWeight={700}>
            Choose your login
          </MuiLink>
        </Alert>
      )}
      <Stack component="form" spacing={2} onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          required
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          required
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <MuiLink component={RouterLink} to="/forgot-password" variant="body2" textAlign="right">
          Forgot password?
        </MuiLink>
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? "Logging in…" : "Log In"}
        </Button>
      </Stack>
      {showSignup && (
        <Typography variant="body2" textAlign="center" mt={3}>
          Don't have an account?{" "}
          <MuiLink component={RouterLink} to="/register" fontWeight={700}>
            Sign up
          </MuiLink>
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" textAlign="center" mt={showSignup ? 2 : 3}>
        Not {/^[aeiou]/i.test(roleLabel) ? "an" : "a"} {roleLabel}?{" "}
        <MuiLink component={RouterLink} to="/login" fontWeight={700}>
          Choose your login
        </MuiLink>
      </Typography>
    </AuthCard>
  );
};

export default RoleLoginPage;
