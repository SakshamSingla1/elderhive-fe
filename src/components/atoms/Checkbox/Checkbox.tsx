import React from "react";
import MuiCheckbox, { type CheckboxProps as MuiCheckboxProps } from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";

export interface CheckboxFieldProps extends Omit<MuiCheckboxProps, "onChange"> {
  label: React.ReactNode;
  onChange?: (checked: boolean) => void;
  helperText?: React.ReactNode;
}

/** Generic labeled checkbox — pairs MUI's Checkbox with FormControlLabel (otherwise always
 *  used together) and exposes onChange as a plain `(checked: boolean) => void`, matching
 *  this app's other field atoms, instead of MUI's raw ChangeEvent. */
const Checkbox: React.FC<CheckboxFieldProps> = ({ label, onChange, helperText, ...rest }) => (
  <div>
    <FormControlLabel
      control={<MuiCheckbox onChange={(event) => onChange?.(event.target.checked)} {...rest} />}
      label={label}
    />
    {helperText && <FormHelperText sx={{ ml: 4, mt: -0.5 }}>{helperText}</FormHelperText>}
  </div>
);

export default Checkbox;
