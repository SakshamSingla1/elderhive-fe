import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Avatar, Box, Card, CardContent, Chip, Grid, List, ListItemButton, ListItemText, Skeleton, Stack, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMessageCircle,
  FiPlus,
  FiShoppingBag,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import StatCard from "../../molecules/StatCard/StatCard";
import { useElderProfileService, type ElderProfileResponseDTO } from "../../../services/useElderProfileService";
import { useBookingService, type BookingResponse } from "../../../services/useBookingService";
import { BookingStatusEnum } from "../../../utils/enums";
import { formatDate, formatTime, getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const UPCOMING_STATUSES: BookingStatusEnum[] = [BookingStatusEnum.PENDING, BookingStatusEnum.CONFIRMED, BookingStatusEnum.IN_PROGRESS];
const STATUS_COLOR: Record<BookingStatusEnum, "default" | "warning" | "info" | "success" | "error"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

const initials = (name: string | null) =>
  (name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface QuickAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Book a Service", description: "Find and schedule a caretaker", icon: <FiShoppingBag size={20} />, path: "/family/services" },
  { label: "Add Elder Profile", description: "Set up care for someone new", icon: <FiUserPlus size={20} />, path: "/family/elder-profiles/new" },
  { label: "Emergency", description: "Get help right now", icon: <FiAlertTriangle size={20} />, path: "/family/emergency" },
  { label: "Messages", description: "Chat with your caretakers", icon: <FiMessageCircle size={20} />, path: "/family/messages" },
];

/**
 * The real Family home, replacing Dashboard/PlaceholderDashboard.page.tsx for this one
 * role. Built entirely from two caller-scoped endpoints that already existed for other
 * pages (ElderProfiles.page.tsx's getMine, Bookings.page.tsx's getMyBookingsAsFamily) -
 * there's no dedicated "dashboard stats" endpoint for this role the way Admin's
 * useAdminDashboardService has (Prompt 94 only ever built that for Admin/Super Admin), so
 * every number here is derived client-side from those two lists rather than a server
 * aggregate. Fine at this scale (a family manages a handful of elders/bookings, not
 * thousands), and it keeps this a pure frontend change.
 */
const FamilyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const elderProfileService = useElderProfileService();
  const bookingService = useBookingService();

  const [elderProfiles, setElderProfiles] = useState<ElderProfileResponseDTO[]>([]);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([elderProfileService.getMine(0, 50), bookingService.getMyBookingsAsFamily(0, 50)])
      .then(([elderProfilePage, bookingPage]) => {
        setElderProfiles(elderProfilePage.content);
        setBookings(bookingPage.content);
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load your dashboard")))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((b) => UPCOMING_STATUSES.includes(b.status))
        .sort((a, b) => `${a.scheduledDate}T${a.scheduledTime}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime}`)),
    [bookings]
  );
  const completedCount = useMemo(() => bookings.filter((b) => b.status === BookingStatusEnum.COMPLETED).length, [bookings]);
  const thisWeekCount = useMemo(
    () => bookings.filter((b) => dayjs(b.scheduledDate).isSame(dayjs(), "week") && UPCOMING_STATUSES.includes(b.status)).length,
    [bookings]
  );

  const greeting = dayjs().hour() < 12 ? "Good morning" : dayjs().hour() < 18 ? "Good afternoon" : "Good evening";

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} mb={1}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight={800}>
            {greeting}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dayjs().format("dddd, MMMM D")} — here's what's happening with your family's care.
          </Typography>
        </Box>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {loadError}
        </Alert>
      )}

      {/* Quick actions */}
      <Grid container spacing={2} sx={{ mt: 2, mb: 1 }}>
        {QUICK_ACTIONS.map((action) => (
          <Grid key={action.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              onClick={() => navigate(action.path)}
              sx={{
                height: "100%",
                cursor: "pointer",
                transition: "transform 150ms ease, box-shadow 150ms ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: 4 },
              }}
            >
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: "primary.dark",
                  }}
                >
                  {action.icon}
                </Box>
                <Typography fontWeight={700}>{action.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Stats */}
      {isLoading ? (
        <Grid container spacing={2} sx={{ my: 1 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={88} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2} sx={{ my: 1 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Elder Profiles" value={elderProfiles.length} icon={<FiUsers />} accentColor={theme.palette.primary.main} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Upcoming Bookings" value={upcomingBookings.length} icon={<FiCalendar />} accentColor={theme.palette.secondary.dark} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="This Week" value={thisWeekCount} icon={<FiClock />} accentColor={theme.palette.warning.dark} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Completed" value={completedCount} icon={<FiCheckCircle />} accentColor={theme.palette.success.dark} />
          </Grid>
        </Grid>
      )}

      {/* Upcoming bookings + elder profiles */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FiCalendar size={18} />
                  <Typography variant="h6" fontWeight={700}>
                    Upcoming Bookings
                  </Typography>
                </Stack>
                {upcomingBookings.length > 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label="View all"
                    icon={<FiArrowRight size={12} />}
                    onClick={() => navigate("/family/bookings")}
                    sx={{ cursor: "pointer" }}
                  />
                )}
              </Stack>
              {isLoading ? (
                <Stack spacing={1}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={64} />
                  ))}
                </Stack>
              ) : upcomingBookings.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 5 }}>
                  <Typography color="text.secondary" mb={2}>
                    No upcoming bookings yet.
                  </Typography>
                  <Chip
                    icon={<FiPlus size={14} />}
                    label="Book a Service"
                    color="primary"
                    onClick={() => navigate("/family/services")}
                    sx={{ cursor: "pointer", fontWeight: 700 }}
                  />
                </Box>
              ) : (
                <List disablePadding>
                  {upcomingBookings.slice(0, 5).map((booking) => (
                    <ListItemButton
                      key={booking.id}
                      divider
                      sx={{ borderRadius: 2, mb: 0.5 }}
                      onClick={() => navigate(`/family/bookings/${booking.id}`)}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography fontWeight={700} component="span">
                              {booking.serviceName ?? "Service"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" component="span">
                              for {booking.elderName ?? "—"}
                            </Typography>
                          </Stack>
                        }
                        secondary={`${formatDate(booking.scheduledDate)} · ${formatTime(booking.scheduledTime)} · ${booking.caretakerName ?? "Unassigned"}`}
                      />
                      <Chip size="small" label={formatEnumLabel(booking.status)} color={STATUS_COLOR[booking.status]} />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FiUsers size={18} />
                  <Typography variant="h6" fontWeight={700}>
                    Your Elder Profiles
                  </Typography>
                </Stack>
                {elderProfiles.length > 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label="Manage"
                    icon={<FiArrowRight size={12} />}
                    onClick={() => navigate("/family/elder-profiles")}
                    sx={{ cursor: "pointer" }}
                  />
                )}
              </Stack>
              {isLoading ? (
                <Stack spacing={1}>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={56} />
                  ))}
                </Stack>
              ) : elderProfiles.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 5 }}>
                  <Typography color="text.secondary" mb={2}>
                    No elder profiles yet.
                  </Typography>
                  <Chip
                    icon={<FiPlus size={14} />}
                    label="Add Elder Profile"
                    color="primary"
                    onClick={() => navigate("/family/elder-profiles/new")}
                    sx={{ cursor: "pointer", fontWeight: 700 }}
                  />
                </Box>
              ) : (
                <List disablePadding>
                  {elderProfiles.map((profile) => (
                    <ListItemButton
                      key={profile.id}
                      divider
                      sx={{ borderRadius: 2, mb: 0.5 }}
                      onClick={() => navigate(`/family/elder-profiles/${profile.id}`)}
                    >
                      <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: 13, mr: 1.5 }}>
                        {initials(profile.fullName)}
                      </Avatar>
                      <ListItemText
                        primary={profile.fullName}
                        secondary={profile.dateOfBirth ? `Born ${formatDate(profile.dateOfBirth)}` : profile.address ?? "No address on file"}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!isLoading && !loadError && upcomingBookings.some((b) => dayjs(`${b.scheduledDate}T${b.scheduledTime}`).isBefore(dayjs().add(1, "day"))) && (
        <Alert icon={<FiCheckCircle />} severity="info" sx={{ mt: 2 }}>
          You have a booking coming up within 24 hours.
        </Alert>
      )}
    </Box>
  );
};

export default FamilyDashboardPage;
