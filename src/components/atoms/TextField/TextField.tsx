import React from "react";
import MuiTextField, { type TextFieldProps as MuiTextFieldProps } from "@mui/material/TextField";

export interface TextFieldProps extends Omit<MuiTextFieldProps, "error"> {
  /**
   * Accepts a validation-library error value directly, e.g.
   * `error={formik.touched.email && formik.errors.email}` — every form in this codebase
   * (Register, ColorThemeForm, ...) currently writes that as two separate props:
   * `error={touched && Boolean(errors)}` plus `helperText={touched && errors}`. A truthy
   * string here becomes both the error flag AND the helperText (an explicit `helperText`
   * prop always wins if also given); `true`/`false`/`undefined`/`""` behave exactly like
   * MUI's own boolean `error` always did.
   */
  error?: boolean | string;
}

/**
 * Generic TextField atom — every call site across this app sets `fullWidth` explicitly
 * (Register/RoleLoginPage/ColorThemeForm/PlatformSettings/ColorPicker), so it defaults on
 * here instead (still overridable). Otherwise a thin pass-through: every other MUI
 * TextField prop works unchanged.
 */
const TextField: React.FC<TextFieldProps> = ({ error, helperText, fullWidth = true, ...rest }) => {
  const isErrorString = typeof error === "string" && error.length > 0;
  return (
    <MuiTextField
      fullWidth={fullWidth}
      error={isErrorString || Boolean(error)}
      helperText={helperText ?? (isErrorString ? error : undefined)}
      {...rest}
    />
  );
};

export default TextField;
