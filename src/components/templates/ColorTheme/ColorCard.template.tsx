import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { FiCheck, FiCheckCircle, FiEdit3, FiEye, FiStar, FiTrash2 } from "react-icons/fi";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { useTheme, type ThemeColors } from "../../../contexts/ThemeContext";
import { useUserThemeService } from "../../../services/useUserThemeService";
import type { ColorThemeResponse } from "../../../services/useColorThemeService";
import { hexToHsl, isColorLight } from "../../../utils/colorUtils";
import { UserTypeEnum } from "../../../utils/enums";
import { getErrorMessage } from "../../../utils/helper";

interface ColorCardProps {
  colorTheme: ColorThemeResponse;
  onDelete?: (id: number) => void;
  /** Forces edit/delete off regardless of role - used by the non-admin "pick your
   *  theme" entry point (Shared/AccountSettings.page.tsx), which reuses this same card
   *  for every role including a SUPER_ADMIN viewing their OWN account settings, not the
   *  admin theme-management surface. Defaults to true (defer to the SUPER_ADMIN check
   *  below), matching every other existing caller. */
  allowMutations?: boolean;
}

function findShadeColor(theme: ColorThemeResponse, needle: string): string | undefined {
  for (const group of theme.palette.colorGroups) {
    for (const shade of group.colorShades) {
      if (shade.colorName.toLowerCase().includes(needle)) return shade.colorCode;
    }
  }
  return undefined;
}

function deriveThemeColors(theme: ColorThemeResponse): ThemeColors {
  return {
    primary: hexToHsl(findShadeColor(theme, "primary500") ?? findShadeColor(theme, "primary") ?? "#3B82F6"),
    accent: hexToHsl(findShadeColor(theme, "accent500") ?? findShadeColor(theme, "accent") ?? "#8B5CF6"),
    background: "225 25% 6%",
    foreground: "210 20% 92%",
    card: "225 20% 10%",
    muted: "225 15% 14%",
    border: "225 15% 18%",
  };
}

/**
 * Ported from Portfolio's ColorCard.template.tsx with substantial simplification: plain
 * MUI (Card/Chip/IconButton/Tooltip) replaces Portfolio's framer-motion + Tailwind +
 * GlassCard glassmorphism treatment, which has no ElderHive equivalent and isn't what
 * this prompt actually asked for (theme name, counts, an Active indicator, swatch strips
 * with click-to-copy, view/edit/delete, Apply). Two deliberate omissions from Portfolio's
 * version: the double-click-anywhere-on-the-card toggles global dark/light mode (an odd,
 * easily-triggered-by-accident side effect unrelated to what a theme card is for, and
 * never asked for here), and the hover-reveal copy-icon overlay on each swatch (the hex
 * tooltip + pointer cursor already communicate "click to copy" on their own).
 *
 * <p>Edit/delete are hidden entirely for a non-SUPER_ADMIN viewer, matching Prompt 43's
 * ColorThemeController gating (POST/PUT/DELETE are hasRole('SUPER_ADMIN') directly, not
 * the Phase 3 permission system) - a curated ADMIN would just get a 403 from either, so
 * there's no reason to show them the buttons at all. View stays available to everyone,
 * matching the controller's own isAuthenticated()-only GET.
 *
 * <p>"Active" means either this theme is the user's actually-persisted active theme
 * (ThemeContext's activeColorTheme, loaded on login - Prompt 48) OR it's the one
 * currently being previewed (isPreviewActive + activeThemeName, the lighter mechanism
 * Apply also drives for instant feedback before the save round-trip resolves).
 */
const ColorCard: React.FC<ColorCardProps> = ({ colorTheme, onDelete, allowMutations = true }) => {
  const navigate = useNavigate();
  const { activeThemeName, activeColorTheme, isPreviewActive, setActiveTheme, resetTheme } = useTheme();
  const userThemeService = useUserThemeService();
  const { user } = useAuthenticatedUser();
  const isSuperAdmin = allowMutations && user?.primaryRole === UserTypeEnum.SUPER_ADMIN;

  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const isActive = activeColorTheme?.id === colorTheme.id || (isPreviewActive && activeThemeName === colorTheme.themeName);

  // A quick-glance gradient banner blending this theme's own primary/accent shades -
  // purely decorative (no text/semantics), so it's safe alongside the swatch strips below
  // without touching anything the tests above assert on.
  const bannerFrom = findShadeColor(colorTheme, "primary500") ?? findShadeColor(colorTheme, "primary") ?? "#3B82F6";
  const bannerTo = findShadeColor(colorTheme, "accent500") ?? findShadeColor(colorTheme, "accent") ?? "#8B5CF6";

  const handleApply = async () => {
    if (isActive) {
      resetTheme();
      return;
    }
    setApplyError(null);
    setActiveTheme(colorTheme.themeName, deriveThemeColors(colorTheme));
    setIsApplying(true);
    try {
      await userThemeService.setActiveTheme(colorTheme.id);
    } catch (err) {
      setApplyError(getErrorMessage(err, "Could not save this as your active theme."));
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedColor(hex);
      setTimeout(() => setCopiedColor((current) => (current === hex ? null : current)), 1500);
    } catch {
      // Clipboard permission denied/unavailable - non-critical, nothing to recover from.
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderColor: isActive ? "success.main" : undefined,
        borderWidth: isActive ? 2 : 1,
        transition: "transform 150ms ease, box-shadow 150ms ease",
        "&:hover": { transform: "translateY(-3px)", boxShadow: 4 },
      }}
    >
      <Box sx={{ height: 8, background: `linear-gradient(90deg, ${bannerFrom}, ${bannerTo})` }} aria-hidden />
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {colorTheme.themeName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" color="text.secondary">
                {colorTheme.palette.colorGroups.length} groups · {colorTheme.palette.colorGroups[0]?.colorShades.length ?? 0} shades each
              </Typography>
              {isActive && <Chip label="Active" size="small" color="success" icon={<FiCheckCircle size={13} />} />}
            </Stack>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title="View">
              <IconButton aria-label="View" size="small" onClick={() => navigate(`/admin/color-themes/${colorTheme.id}`)}>
                <FiEye size={16} />
              </IconButton>
            </Tooltip>
            {isSuperAdmin && (
              <>
                <Tooltip title="Edit">
                  <IconButton aria-label="Edit" size="small" onClick={() => navigate(`/admin/color-themes/${colorTheme.id}/edit`)}>
                    <FiEdit3 size={16} />
                  </IconButton>
                </Tooltip>
                {onDelete && (
                  <Tooltip title="Delete">
                    <IconButton aria-label="Delete" size="small" color="error" onClick={() => onDelete(colorTheme.id)}>
                      <FiTrash2 size={16} />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Stack>
        </Stack>

        <Stack spacing={1.5}>
          {colorTheme.palette.colorGroups.map((group) => (
            <Box key={group.groupName}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", display: "block", mb: 0.5 }}>
                {group.groupName}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {group.colorShades.map((shade) => (
                  <Tooltip key={shade.colorName} title={shade.colorCode} arrow>
                    <Box
                      role="button"
                      tabIndex={0}
                      aria-label={`Copy ${shade.colorName} (${shade.colorCode}) to clipboard`}
                      onClick={() => handleCopy(shade.colorCode)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleCopy(shade.colorCode);
                        }
                      }}
                      sx={{
                        flex: 1,
                        height: 32,
                        minWidth: 0,
                        borderRadius: 1,
                        backgroundColor: shade.colorCode,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid",
                        borderColor: "divider",
                        transition: "transform 120ms ease",
                        "&:hover": { transform: "scale(1.08)", zIndex: 1 },
                      }}
                    >
                      {copiedColor === shade.colorCode && <FiCheck size={14} color={isColorLight(shade.colorCode) ? "#000000" : "#FFFFFF"} />}
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          ))}
        </Stack>

        {applyError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {applyError}
          </Alert>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 2, pt: 0 }}>
        <Button
          variant={isActive ? "contained" : "outlined"}
          color={isActive ? "success" : "primary"}
          size="small"
          startIcon={isApplying ? <CircularProgress size={14} color="inherit" /> : isActive ? <FiStar size={14} /> : undefined}
          onClick={handleApply}
          disabled={isApplying}
        >
          {isApplying ? "Applying…" : isActive ? "Applied" : "Apply"}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ColorCard;
