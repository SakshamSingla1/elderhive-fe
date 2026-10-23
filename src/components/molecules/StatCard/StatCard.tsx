import React from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accentColor?: string;
}

// A single number/label tile for an admin overview (Prompt 94's dashboard stats) -
// consolidates the hand-rolled "icon in a tinted circle + big number + label" Card every
// such page would otherwise repeat, same role ElderSphere's own StatCard plays.
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accentColor = "#2F6F5E" }) => (
  <Card sx={{ height: "100%" }}>
    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      {icon && (
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${accentColor}1f`,
            color: accentColor,
            flexShrink: 0,
            "& svg": { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
      )}
      <Box minWidth={0}>
        <Typography variant="h5" fontWeight={800} noWrap lineHeight={1.2}>
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
