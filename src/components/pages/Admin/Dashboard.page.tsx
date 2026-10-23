import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Card, CardContent, Grid, List, ListItem, ListItemText, Skeleton, Stack, Typography } from "@mui/material";
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import StatCard from "../../molecules/StatCard/StatCard";
import { useAdminDashboardService } from "../../../services/useAdminDashboardService";
import type { AdminDashboardStatsResponse } from "../../../services/useAdminDashboardService";
import { getErrorMessage } from "../../../utils/helper";

const STAT_CARD_COUNT = 4;

// Admin/Super-Admin home (Prompt 95) - a StatCard/ActivityFeed-style overview wired to
// GET /api/v1/dashboard/stats (DASHBOARD_VIEW-gated, Prompt 94). No timeseries/charts here
// unlike ~/ElderSphere/eldersphere-fe's own Dashboard.page.tsx reference - that stats
// endpoint has no equivalent history data (just current counts), so this stays a single
// snapshot rather than fabricating a trend it can't actually show.
const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dashboardService = useAdminDashboardService();
  const [stats, setStats] = useState<AdminDashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    dashboardService
      .getStats()
      .then(setStats)
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load dashboard stats")))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <Typography variant="h5" component="h1" fontWeight={800} gutterBottom>
        Platform Overview
      </Typography>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {isLoading ? (
        <Grid container spacing={2} mb={3}>
          {Array.from({ length: STAT_CARD_COUNT }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={88} />
            </Grid>
          ))}
        </Grid>
      ) : stats ? (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Bookings This Week" value={stats.bookingsThisWeek} icon={<FiCalendar />} accentColor="#3178C6" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Open Emergency Alerts" value={stats.openEmergencyAlerts} icon={<FiAlertTriangle />} accentColor="#C0392B" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Overdue Alerts" value={stats.overdueEmergencyAlerts} icon={<FiClock />} accentColor="#E8A33D" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label="Pending Caretaker Verifications"
                value={stats.pendingCaretakerVerifications}
                icon={<FiCheckCircle />}
                accentColor="#2F6F5E"
              />
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <FiUsers size={18} />
                <Typography variant="h6" fontWeight={700}>
                  Active Users by Role
                </Typography>
              </Stack>
              <List disablePadding>
                {Object.entries(stats.activeUsersByRole).map(([role, count]) => (
                  <ListItem
                    key={role}
                    divider
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/admin/users?userType=${role}`)}
                  >
                    <ListItemText primary={role} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      {count.toLocaleString()}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </>
      ) : null}
    </Box>
  );
};

export default AdminDashboardPage;
