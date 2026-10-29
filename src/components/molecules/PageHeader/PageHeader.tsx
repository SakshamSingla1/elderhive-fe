import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";

export interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  /** Buttons/chips rendered on the right, e.g. an "Add X" button. */
  action?: React.ReactNode;
  /** Extra content rendered next to the title itself (a status chip, a badge) - stays on
   *  the title's own line rather than wrapping to the subtitle row. */
  titleAdornment?: React.ReactNode;
}

/**
 * The icon-badge + title + subtitle header every page in the app now opens with -
 * consolidates what used to be a hand-rolled `<Stack><Icon/><Box><Typography/></Box></Stack>`
 * repeated with slightly different spacing/sizing on every single page (Dashboards had no
 * icon at all; list pages used a bare un-badged icon; the three Prompt-74 forms introduced
 * the badged-icon treatment this molecule generalizes). One component, one visual language,
 * everywhere.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle, action, titleAdornment }) => {
  const theme = useTheme();

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" rowGap={1.5}>
      <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: "primary.main",
            flexShrink: 0,
            "& svg": { display: "block" },
          }}
        >
          {icon}
        </Box>
        <Box minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
            <Typography variant="h5" fontWeight={800} noWrap>
              {title}
            </Typography>
            {titleAdornment}
          </Stack>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
};

export default PageHeader;
