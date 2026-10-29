import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Card, CardContent, Chip, Grid, List, ListItemButton, ListItemText, Skeleton, Stack, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { FiAlertTriangle, FiArrowRight, FiCalendar, FiCheckCircle, FiClock, FiMapPin, FiStar } from "react-icons/fi";
import StatCard from "../../molecules/StatCard/StatCard";
import DashboardHero from "../../molecules/DashboardHero/DashboardHero";
import { useCaretakerService, type CaretakerProfileResponseDTO } from "../../../services/useCaretakerService";
import { useBookingService, type BookingResponse } from "../../../services/useBookingService";
import { useEmergencyAlertService, type EmergencyAlertResponse } from "../../../services/useEmergencyAlertService";
import { BookingStatusEnum, CaretakerVerificationStatusEnum } from "../../../utils/enums";
import { formatDate, formatTime, getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const UPCOMING_STATUSES: BookingStatusEnum[] = [BookingStatusEnum.PENDING, BookingStatusEnum.CONFIRMED, BookingStatusEnum.IN_PROGRESS];
const BOOKING_STATUS_COLOR: Record<BookingStatusEnum, "default" | "warning" | "info" | "success" | "error"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

/**
 * The real Caretaker home, replacing Dashboard/PlaceholderDashboard.page.tsx for this one
 * role. Built from three endpoints that already existed for other pages (MyProfile.page's
 * getMyProfile, Bookings.page's getMyBookingsAsCaretaker, Emergency.page's getNearby) - no
 * backend changes. Leads with the verification-status banner and any nearby active
 * emergency alerts, since both are the two things most likely to need this caretaker's
 * immediate attention; everything else (bookings, rating) follows below.
 */
const CaretakerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const caretakerService = useCaretakerService();
  const bookingService = useBookingService();
  const emergencyAlertService = useEmergencyAlertService();

  const [profile, setProfile] = useState<CaretakerProfileResponseDTO | null>(null);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [nearbyAlerts, setNearbyAlerts] = useState<EmergencyAlertResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      caretakerService.getMyProfile(),
      bookingService.getMyBookingsAsCaretaker(0, 50),
      // Best-effort - a caretaker with no profile yet (or not verified, in some backend
      // configurations) still has a dashboard to see; a failure here just means "no
      // nearby alerts to show" rather than a page-wide error.
      emergencyAlertService.getNearby().catch(() => []),
    ])
      .then(([caretakerProfile, bookingPage, alerts]) => {
        setProfile(caretakerProfile);
        setBookings(bookingPage.content);
        setNearbyAlerts(alerts);
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

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={88} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <DashboardHero greeting={greeting} dateLabel={dayjs().format("dddd, MMMM D")} />

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {profile && profile.verificationStatus !== CaretakerVerificationStatusEnum.VERIFIED && (
        <Alert
          severity={profile.verificationStatus === CaretakerVerificationStatusEnum.REJECTED ? "error" : "warning"}
          sx={{ mb: 2 }}
          action={
            <Chip size="small" label="My Profile" onClick={() => navigate("/caretaker/my-profile")} sx={{ cursor: "pointer" }} />
          }
        >
          {profile.verificationStatus === CaretakerVerificationStatusEnum.REJECTED
            ? "Your verification documents were rejected. Resubmit them to start receiving bookings and emergency alerts."
            : "Your profile is pending verification. You won't be matched to bookings or emergency alerts until an admin approves your documents."}
        </Alert>
      )}

      {nearbyAlerts.length > 0 && (
        <Card
          sx={{
            mb: 2,
            border: "2px solid",
            borderColor: "error.main",
            background: alpha(theme.palette.error.main, 0.06),
          }}
        >
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <FiAlertTriangle color={theme.palette.error.main} size={20} />
              <Typography variant="h6" fontWeight={800} color="error.main">
                {nearbyAlerts.length} Active Emergency {nearbyAlerts.length === 1 ? "Alert" : "Alerts"} Nearby
              </Typography>
            </Stack>
            <List disablePadding>
              {nearbyAlerts.slice(0, 3).map((alert) => (
                <ListItemButton key={alert.id} divider sx={{ borderRadius: 2, mb: 0.5 }} onClick={() => navigate("/caretaker/emergency")}>
                  <ListItemText
                    primary={alert.elderName ?? "Elder"}
                    secondary={
                      <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                        <FiMapPin size={12} />
                        <span>{alert.distanceKm != null ? `${alert.distanceKm.toFixed(1)} km away` : alert.address ?? "Location unavailable"}</span>
                      </Stack>
                    }
                  />
                  {alert.isOverdue && <Chip size="small" label="Overdue" color="error" variant="outlined" sx={{ mr: 1 }} />}
                  <Chip size="small" label="Respond" color="error" />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2} sx={{ mb: 1 }}>
        {[
          { label: "Upcoming Bookings", value: upcomingBookings.length, icon: <FiCalendar />, accentColor: theme.palette.primary.main },
          { label: "This Week", value: thisWeekCount, icon: <FiClock />, accentColor: theme.palette.warning.dark },
          { label: "Completed", value: completedCount, icon: <FiCheckCircle />, accentColor: theme.palette.success.dark },
          {
            label: "Rating",
            value: profile?.ratingAverage ? profile.ratingAverage.toFixed(1) : "—",
            icon: <FiStar />,
            accentColor: theme.palette.secondary.dark,
          },
        ].map((stat, i) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
              style={{ height: "100%" }}
            >
              <StatCard label={stat.label} value={stat.value} icon={stat.icon} accentColor={stat.accentColor} />
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Card>
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
                onClick={() => navigate("/caretaker/bookings")}
                sx={{ cursor: "pointer" }}
              />
            )}
          </Stack>
          {upcomingBookings.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Typography color="text.secondary">No upcoming bookings yet.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {upcomingBookings.slice(0, 5).map((booking) => (
                <ListItemButton key={booking.id} divider sx={{ borderRadius: 2, mb: 0.5 }} onClick={() => navigate("/caretaker/bookings")}>
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
                    secondary={`${formatDate(booking.scheduledDate)} · ${formatTime(booking.scheduledTime)}`}
                  />
                  <Chip size="small" label={formatEnumLabel(booking.status)} color={BOOKING_STATUS_COLOR[booking.status]} />
                </ListItemButton>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CaretakerDashboardPage;
