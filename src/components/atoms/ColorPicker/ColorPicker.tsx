import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { HexColorPicker } from "react-colorful";
import { FiCheck } from "react-icons/fi";
import { MdExpandMore } from "react-icons/md";
import { isColorLight } from "../../../utils/colorUtils";

/**
 * Ported from Portfolio's components/atoms/ColorPicker/ColorPicker.tsx with minimal
 * changes: MUI's own TextField/Button/Popover/Box replace Portfolio's custom TextField/
 * Button atoms and react-jss styles (ElderHive has neither, so this uses the plain-MUI
 * `sx` convention every other ElderHive component already follows); `useTheme()`'s
 * `theme.palette` replaces Portfolio's `useColors()` context (ElderHive has no equivalent
 * color-context hook yet); the rotating chevron icon is react-icons' MdExpandMore instead
 * of `@mui/icons-material`'s ExpandMore, per this project's icon-library rule. The actual
 * picker behavior — Popover-hosted HexColorPicker, live contrast-aware preview, 8 preset
 * swatches, a session-local recent-colors row (max 6), and Apply/Cancel against a local
 * temp color that never touches the parent's value until Apply — is unchanged.
 */

export interface ColorPickerProps extends Omit<React.ComponentProps<typeof TextField>, "onChange" | "value"> {
  value?: string;
  onChange?: (color: string) => void;
  disabled?: boolean;
  showPresets?: boolean;
}

const PRESET_COLORS = [
  "#6366F1",
  "#EC4899",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#8B5CF6",
  "#111827",
];

const RECENT_COLORS_MAX = 6;

const isValidHex = (hex: string) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

const ColorPicker: React.FC<ColorPickerProps> = ({
  value = "#6366F1",
  onChange,
  disabled = false,
  showPresets = true,
  ...textFieldProps
}) => {
  const theme = useTheme();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [tempColor, setTempColor] = useState(value);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) setTempColor(value);
  }, [open, value]);

  const handleApply = () => {
    if (!isValidHex(tempColor)) return;
    onChange?.(tempColor);
    setRecentColors((prev) => [tempColor, ...prev.filter((c) => c.toLowerCase() !== tempColor.toLowerCase())].slice(0, RECENT_COLORS_MAX));
    setOpen(false);
  };

  const handleCancel = () => {
    setTempColor(value);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip any leading "#" the field already has (one or more - e.g. after clearing the
    // field to "", Portfolio's original `startsWith("#") ? value : "#"+value` logic
    // re-prepends a bare "#" even for an empty field, so the very next keystroke's own
    // "#" lands on top of that and produces "##..."), then add back exactly one. An
    // empty field stays empty rather than being forced to a lone "#".
    const raw = e.target.value.replace(/^#+/, "");
    setTempColor(raw ? `#${raw}` : "");
  };

  const previewTextColor = useMemo(
    () => (isColorLight(tempColor) ? theme.palette.common.black : theme.palette.common.white),
    [tempColor, theme]
  );

  const renderSwatchRow = (colors: string[]) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {colors.map((color) => {
        const isActive = color.toLowerCase() === tempColor.toLowerCase();
        return (
          <Box
            key={color}
            role="button"
            tabIndex={0}
            aria-label={`Select color ${color}`}
            aria-pressed={isActive}
            onClick={() => setTempColor(color)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setTempColor(color);
              }
            }}
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              border: isActive ? `2px solid ${theme.palette.background.paper}` : "2px solid transparent",
              outline: isActive ? `2px solid ${theme.palette.primary.main}` : "none",
              backgroundColor: color,
              boxShadow: isActive ? `0 4px 12px ${color}60` : `0 2px 8px ${color}40`,
              "&:hover": { transform: "scale(1.15)" },
            }}
          >
            {isActive && <FiCheck size={12} color={isColorLight(color) ? theme.palette.common.black : theme.palette.common.white} />}
          </Box>
        );
      })}
    </Box>
  );

  return (
    <>
      <Box
        ref={anchorRef}
        onClick={() => !disabled && setOpen(true)}
        sx={{ display: "inline-block", width: "100%", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}
      >
        <TextField
          {...textFieldProps}
          value={value}
          disabled={disabled}
          fullWidth
          slotProps={{
            input: {
              readOnly: true,
              startAdornment: (
                <InputAdornment position="start">
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: value,
                      boxShadow: `inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 2px ${theme.palette.background.paper}, 0 0 0 3px ${theme.palette.divider}`,
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <MdExpandMore
                    size={18}
                    style={{
                      transform: open ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "0.2s",
                      color: theme.palette.text.secondary,
                    }}
                  />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={handleCancel}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: theme.palette.background.paper,
              borderRadius: "16px",
              padding: "12px",
              width: 220,
              boxShadow: "0 32px 64px -12px rgba(0,0,0,0.25)",
              border: `1.5px solid ${theme.palette.divider}`,
            },
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box
            sx={{
              padding: "6px 8px",
              borderRadius: 2,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 40,
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.1), 0 8px 16px -4px rgba(0,0,0,0.1)",
              background: `linear-gradient(135deg, ${tempColor} 0%, ${tempColor}DD 100%)`,
              color: previewTextColor,
              textShadow: isColorLight(tempColor) ? "none" : "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            {tempColor.toUpperCase()}
          </Box>

          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <HexColorPicker color={tempColor} onChange={setTempColor} style={{ width: "100%", height: 120 }} />
          </Box>

          <TextField
            value={tempColor}
            onChange={handleInputChange}
            error={!isValidHex(tempColor)}
            helperText={!isValidHex(tempColor) ? "Invalid HEX" : ""}
            fullWidth
            slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
          />

          {showPresets && (
            <>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: theme.palette.text.secondary, letterSpacing: "0.5px", textTransform: "uppercase" }}
              >
                Presets
              </Typography>
              {renderSwatchRow(PRESET_COLORS)}
            </>
          )}

          {recentColors.length > 0 && (
            <>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: theme.palette.text.secondary, letterSpacing: "0.5px", textTransform: "uppercase" }}
              >
                Recent
              </Typography>
              {renderSwatchRow(recentColors)}
            </>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
            <Button size="small" variant="outlined" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={handleApply}>
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default React.memo(ColorPicker);
