import React from "react";
import { Typography } from "@mui/material";

// Temporary placeholder — each role's real Dashboard page replaces this in a later phase.
// Shared across all four route shells (Prompt 35) rather than four near-identical files,
// since there's nothing role-specific to show yet beyond the label.
const PlaceholderDashboardPage: React.FC<{ roleLabel: string }> = ({ roleLabel }) => (
  <>
    <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
      {roleLabel} Dashboard
    </Typography>
    <Typography variant="body1" color="text.secondary">
      This is a placeholder — the real {roleLabel.toLowerCase()} dashboard lands in a later phase.
    </Typography>
  </>
);

export default PlaceholderDashboardPage;
