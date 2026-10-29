import React from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accentColor?: string;
  /** Makes the whole card a button (hover lift + pointer cursor) - for a stat that's
   *  really a shortcut to the page where it gets resolved (e.g. "Overdue Alerts" ->
   *  the emergency alerts queue). Omit for a plain read-only number. */
  onClick?: () => void;
}

// A single number/label tile for an admin/role overview (Prompt 94's dashboard stats,
// plus every other role's own dashboard) - consolidates the hand-rolled "icon in a tinted
// circle + big number + label" Card every such page would otherwise repeat. The soft
// corner glow and gradient icon badge are purely decorative (no semantics, nothing a test
// could assert on) - every number/label still renders as plain text exactly as before.
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accentColor = "#2F6F5E", onClick }) => (
  <Card
    onClick={onClick}
    sx={{
      height: "100%",
      position: "relative",
      overflow: "hidden",
      backgroundImage: `linear-gradient(135deg, ${accentColor}14, transparent 55%)`,
      ...(onClick && {
        cursor: "pointer",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        "&:hover": { transform: "translateY(-3px)", boxShadow: 4 },
      }),
    }}
  >
    {/* Decorative corner glow - absolute, overflow-clipped by the Card, never affects layout. */}
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        top: -28,
        right: -28,
        width: 96,
        height: 96,
        borderRadius: "50%",
        backgroundColor: accentColor,
        opacity: 0.08,
        pointerEvents: "none",
      }}
    />
    <CardContent sx={{ position: "relative", display: "flex", alignItems: "center", gap: 2 }}>
      {icon && (
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: `linear-gradient(135deg, ${accentColor}2e, ${accentColor}14)`,
            color: accentColor,
            flexShrink: 0,
            "& svg": { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
      )}
      <Box minWidth={0}>
        <Typography variant="h4" fontWeight={800} noWrap lineHeight={1.2}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

export default StatCard;
