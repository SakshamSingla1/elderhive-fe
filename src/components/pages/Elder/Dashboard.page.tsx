import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Avatar, Box, Card, CardContent, Chip, Grid, List, ListItem, ListItemText, Skeleton, Stack, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import { FiAlertTriangle, FiEdit2, FiMail, FiMessageCircle, FiUser, FiUsers } from "react-icons/fi";
import Button from "../../atoms/Button/Button";
import { useElderProfileService, type ElderProfileResponseDTO, type FamilyMemberSummaryDTO } from "../../../services/useElderProfileService";
import { formatDate, getErrorMessage } from "../../../utils/helper";

const initials = (name: string | null) =>
  (name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * The real Elder home, replacing Dashboard/PlaceholderDashboard.page.tsx for this one
 * role. Deliberately lighter than Family/Dashboard.page.tsx - an elder has no bookings
 * list of their own (BookingController only exposes "mine as family"/"mine as
 * caretaker", Prompt 77 - there's no "mine as elder" endpoint) and nothing to manage
 * beyond their own profile, so this leans on the Emergency SOS action (the single most
 * important thing on this role's screen) plus a read-only view of who's in their care
 * circle (ElderProfileController's family-members endpoint, already reachable by the
 * elder themselves - see assertCanAccess's isElderOwner branch).
 */
const ElderDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const elderProfileService = useElderProfileService();

  const [profile, setProfile] = useState<ElderProfileResponseDTO | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberSummaryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    elderProfileService
      .getMyProfile()
      .then((p) => {
        setProfile(p);
        return elderProfileService.listFamilyMembers(p.id);
      })
      .then((members) => setFamilyMembers(members ?? []))
      .catch((err) => {
        // A 404 (ELDER_PROFILE_NOT_FOUND) just means no profile exists yet - a real
        // first-run state, not an error to alarm the user with (same precedent
        // Elder/Emergency.page.tsx's own getMyProfile().catch already established).
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setHasProfile(false);
        } else {
          setLoadError(getErrorMessage(err, "Could not load your dashboard"));
        }
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = dayjs().hour() < 12 ? "Good morning" : dayjs().hour() < 18 ? "Good afternoon" : "Good evening";

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={140} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h1" fontWeight={800} gutterBottom>
        {greeting}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {dayjs().format("dddd, MMMM D")}
      </Typography>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {!hasProfile && !loadError && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You haven't set up your profile yet. A family member may set it up for you, or you can add your own details.
        </Alert>
      )}

      {/* Emergency - the single most important action on this screen, so it leads */}
      <Card
        sx={{
          mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
          color: theme.palette.error.contrastText,
          cursor: "pointer",
          transition: "transform 150ms ease",
          "&:hover": { transform: "translateY(-2px)" },
        }}
        onClick={() => navigate("/elder/emergency")}
      >
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.2)",
              flexShrink: 0,
            }}
          >
            <FiAlertTriangle size={28} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800}>
              Need help right now?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Tap here to send an emergency alert to nearby caretakers and your family.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FiUser size={18} />
                  <Typography variant="h6" fontWeight={700}>
                    Your Profile
                  </Typography>
                </Stack>
                <Button size="small" variant="outlined" startIcon={<FiEdit2 size={14} />} onClick={() => navigate("/elder/my-profile")}>
                  Edit
                </Button>
              </Stack>
              {profile ? (
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: "primary.main", width: 44, height: 44 }}>{initials(profile.fullName)}</Avatar>
                    <Box>
                      <Typography fontWeight={700}>{profile.fullName}</Typography>
                      {profile.dateOfBirth && (
                        <Typography variant="caption" color="text.secondary">
                          Born {formatDate(profile.dateOfBirth)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {profile.address || "No address on file"}
                  </Typography>
                  {profile.emergencyContactName && (
                    <Typography variant="body2" color="text.secondary">
                      Emergency contact: {profile.emergencyContactName}
                      {profile.emergencyContactPhone ? ` · ${profile.emergencyContactPhone}` : ""}
                    </Typography>
                  )}
                </Stack>
              ) : (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <Typography color="text.secondary" mb={2}>
                    No profile details yet.
                  </Typography>
                  <Chip
                    icon={<FiEdit2 size={14} />}
                    label="Set Up Profile"
                    color="primary"
                    onClick={() => navigate("/elder/my-profile")}
                    sx={{ cursor: "pointer", fontWeight: 700 }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <FiUsers size={18} />
                <Typography variant="h6" fontWeight={700}>
                  Your Care Circle
                </Typography>
              </Stack>
              {familyMembers.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <Typography color="text.secondary" mb={2}>
                    No family members linked yet.
                  </Typography>
                  <Chip
                    icon={<FiMail size={14} />}
                    label="View Invites"
                    color="primary"
                    onClick={() => navigate("/elder/invites")}
                    sx={{ cursor: "pointer", fontWeight: 700 }}
                  />
                </Box>
              ) : (
                <List disablePadding>
                  {familyMembers.map((member) => (
                    <ListItem key={member.userId} disableGutters divider>
                      <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.25), color: "secondary.dark", width: 36, height: 36, fontSize: 13, mr: 1.5 }}>
                        {initials(member.fullName)}
                      </Avatar>
                      <ListItemText
                        primary={member.fullName ?? "Family member"}
                        secondary={member.relationshipLabel ?? (member.isOwner ? "Primary contact" : "Family member")}
                      />
                      {member.isOwner && <Chip size="small" label="Primary" variant="outlined" />}
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
        <Button variant="outlined" startIcon={<FiMessageCircle size={16} />} onClick={() => navigate("/elder/messages")}>
          Messages
        </Button>
        <Button variant="outlined" startIcon={<FiMail size={16} />} onClick={() => navigate("/elder/invites")}>
          Invites
        </Button>
      </Stack>
    </Box>
  );
};

export default ElderDashboardPage;
