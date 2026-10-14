import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Card, Link as MuiLink, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import FavoriteIcon from "@mui/icons-material/Favorite";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SecurityIcon from "@mui/icons-material/Security";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import ElderlyIcon from "@mui/icons-material/Elderly";

export type AuthCardVariant = "default" | "admin" | "super-admin" | "family" | "caretaker" | "elder";

export interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Switches the side panel's icon and copy to match the portal this page belongs to.
   *  "admin"/"super-admin" also switch the gradient to a dialed-back, staff tone. */
  variant?: AuthCardVariant;
}

interface VariantMeta {
  icon: React.ReactNode;
  brandSuffix: string;
  headline: string;
  body: string;
  /** Staff-tone (neutral grey) gradient vs. the warm default gradient. */
  staffTone: boolean;
}

const VARIANT_META: Record<AuthCardVariant, VariantMeta> = {
  default: {
    icon: <FavoriteIcon />,
    brandSuffix: "",
    headline: "Compassionate care, right at home.",
    body: "Connecting families, elders, and caretakers on one coordinated platform.",
    staffTone: false,
  },
  admin: {
    icon: <AdminPanelSettingsIcon />,
    brandSuffix: " Admin",
    headline: "Internal access for platform administrators.",
    body: "This portal is reserved for ElderHive staff. Sign in with your administrator credentials.",
    staffTone: true,
  },
  "super-admin": {
    icon: <SecurityIcon />,
    brandSuffix: " Super Admin",
    headline: "Full platform access for super administrators.",
    body: "Reserved for super administrator accounts with unrestricted control over the platform.",
    staffTone: true,
  },
  family: {
    icon: <FamilyRestroomIcon />,
    brandSuffix: "",
    headline: "Caring for your family, together.",
    body: "Manage bookings and care for the people you love, all from one place.",
    staffTone: false,
  },
  caretaker: {
    icon: <VolunteerActivismIcon />,
    brandSuffix: "",
    headline: "Meaningful care work, made simple.",
    body: "Manage your schedule and bookings as a verified ElderHive caretaker.",
    staffTone: false,
  },
  elder: {
    icon: <ElderlyIcon />,
    brandSuffix: "",
    headline: "Your care, your way.",
    body: "View your bookings and stay connected with your family and caretakers.",
    staffTone: false,
  },
};

// Shared chrome for every auth page (login/register/forgot/reset password) — a two-column
// layout on wider screens: a brand/messaging panel alongside the actual form card.
// Collapses to just the centered card on mobile.
const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children, variant = "default" }) => {
  const theme = useTheme();
  const meta = VARIANT_META[variant];
  const isStaff = meta.staffTone;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: "background.default" }}>
      {/* Brand panel — hidden below md, so mobile just gets the form card full-width. */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          width: "42%",
          minWidth: 380,
          position: "relative",
          overflow: "hidden",
          p: 6,
          background: isStaff
            ? `linear-gradient(160deg, ${theme.palette.grey[900]} 0%, ${theme.palette.primary.dark} 80%, ${theme.palette.secondary.dark} 140%)`
            : `linear-gradient(160deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.dark} 130%)`,
          color: theme.palette.primary.contrastText,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: alpha("#FFFFFF", 0.08),
          }}
        />
        <Stack direction="row" alignItems="center" spacing={1} mb={4} sx={{ position: "relative" }}>
          {meta.icon}
          <Typography variant="h6" component="span" fontWeight={800}>
            ElderHive{meta.brandSuffix}
          </Typography>
        </Stack>
        {/* Marketing copy in the side panel, not the page's actual heading — the form
            title below (rendered as the real <h1>) is what the page is "about". */}
        <Typography
          variant="h3"
          component="p"
          fontWeight={800}
          sx={{ position: "relative", fontSize: { md: isStaff ? 30 : 32, lg: isStaff ? 34 : 38 }, mb: 2, lineHeight: 1.2 }}
        >
          {meta.headline}
        </Typography>
        <Typography sx={{ position: "relative", opacity: 0.9 }}>{meta.body}</Typography>
      </Box>

      {/* Form panel */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 2, sm: 4 } }}>
        <Box sx={{ width: "100%", maxWidth: 440 }}>
          <Card sx={{ width: "100%", p: 1 }}>
            <Box sx={{ p: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                justifyContent="center"
                mb={2}
                sx={{ display: { xs: "flex", md: "none" } }}
              >
                <MuiLink component={RouterLink} to="/" underline="none" color="inherit">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {React.cloneElement(meta.icon as React.ReactElement, { color: "primary" } as object)}
                    <Typography variant="h6" component="span" fontWeight={800}>
                      ElderHive{meta.brandSuffix}
                    </Typography>
                  </Stack>
                </MuiLink>
              </Stack>
              <Typography variant="h5" component="h1" fontWeight={800} textAlign="center" gutterBottom>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                  {subtitle}
                </Typography>
              )}
              {children}
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthCard;
