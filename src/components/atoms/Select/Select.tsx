import React, { useId } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect, { type SelectProps as MuiSelectProps } from "@mui/material/Select";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
}

export interface SelectFieldProps<T extends string | number = string>
  extends Omit<MuiSelectProps<T>, "error" | "value" | "onChange"> {
  label: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Same convention as atoms/TextField: a truthy string sets the error state AND becomes
   *  the helperText unless an explicit `helperText` is also given. */
  error?: boolean | string;
  helperText?: React.ReactNode;
}

/**
 * Generic labeled Select atom — plain MUI requires FormControl + InputLabel + Select +
 * MenuItem + FormHelperText assembled by hand for every labeled dropdown (nothing in this
 * app builds one yet, but every page that eventually does would otherwise repeat this same
 * five-component wiring). Takes a flat `options` array instead.
 */
function Select<T extends string | number = string>({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  required,
  disabled,
  fullWidth = true,
  ...rest
}: SelectFieldProps<T>) {
  const labelId = useId();
  const isErrorString = typeof error === "string" && error.length > 0;
  const hasError = isErrorString || Boolean(error);
  const resolvedHelperText = helperText ?? (isErrorString ? error : undefined);

  return (
    <FormControl fullWidth={fullWidth} error={hasError} required={required} disabled={disabled}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <MuiSelect<T>
        labelId={labelId}
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        {...rest}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {resolvedHelperText && <FormHelperText>{resolvedHelperText}</FormHelperText>}
    </FormControl>
  );
}

export default Select;
