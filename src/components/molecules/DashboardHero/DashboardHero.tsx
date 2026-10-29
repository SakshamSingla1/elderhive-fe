import React from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";

export interface DashboardHeroProps {
  greeting: string;
  dateLabel: string;
  message?: string;
}

/**
 * The gradient welcome banner every role's own dashboard (Family/Elder/Caretaker - the
 * three with a personalized "Good morning/afternoon/evening" greeting, not Admin's
 * platform-wide PageHeader) now opens with, replacing a plain two-line Typography block.
 * Pure decoration layered on top of the exact same greeting/date/message text those pages
 * already computed - every string still renders exactly as before, just inside a themed,
 * illustrated banner instead of bare text.
 */
const DashboardHero: React.FC<DashboardHeroProps> = ({ greeting, dateLabel, message }) => {
  const theme = useTheme();
  const { user } = useAuthenticatedUser();

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        mb: 3,
        px: { xs: 2.5, sm: 4 },
        py: { xs: 3, sm: 3.5 },
        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.dark})`,
        color: theme.palette.primary.contrastText,
        display: "flex",
        alignItems: "center",
        gap: 2.5,
      }}
    >
      {/* Purely decorative depth - two soft overlapping circles, clipped by the banner's
          own overflow:hidden, never affecting layout or text content. */}
      <Box
        aria-hidden
        sx={{ position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.08)" }}
      />
      <Box
        aria-hidden
        sx={{ position: "absolute", bottom: -70, right: 80, width: 140, height: 140, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.06)" }}
      />
      <Avatar
        sx={{
          width: { xs: 48, sm: 56 },
          height: { xs: 48, sm: 56 },
          bgcolor: "rgba(255,255,255,0.18)",
          color: "inherit",
          fontSize: 22,
          fontWeight: 700,
          flexShrink: 0,
          border: "2px solid rgba(255,255,255,0.3)",
        }}
      >
        {user?.email?.[0]?.toUpperCase() ?? "?"}
      </Avatar>
      <Box sx={{ position: "relative", zIndex: 1, minWidth: 0 }}>
        <Typography variant="h5" component="h1" fontWeight={800}>
          {greeting}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.25 }}>
          {dateLabel}
          {message ? ` — ${message}` : ""}
        </Typography>
      </Box>
    </Box>
  );
};

export default DashboardHero;
