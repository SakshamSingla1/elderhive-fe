import React from "react";
import MuiButton, { type ButtonProps as MuiButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

export interface ButtonProps extends MuiButtonProps {
  /** Shows a spinner in place of startIcon and disables the button — the exact
   *  `disabled={formik.isSubmitting}` + manual spinner-or-label pattern every submit
   *  button in this app (Register, RoleLoginPage, PlatformSettings) currently hand-rolls. */
  loading?: boolean;
  /** Label shown instead of `children` while `loading` is true (e.g. "Creating account…"
   *  instead of "Create Account"). Falls back to `children` unchanged if omitted. */
  loadingText?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ loading = false, loadingText, disabled, startIcon, children, ...rest }) => (
  <MuiButton
    disabled={disabled || loading}
    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
    {...rest}
  >
    {loading && loadingText !== undefined ? loadingText : children}
  </MuiButton>
);

export default Button;
