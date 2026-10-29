import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Card, CardContent, Chip, Grid, LinearProgress, List, ListItem, ListItemText, Skeleton, Stack, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDroplet,
  FiFileText,
  FiSettings,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import StatCard from "../../molecules/StatCard/StatCard";
import { useAdminDashboardService } from "../../../services/useAdminDashboardService";
import type { AdminDashboardStatsResponse } from "../../../services/useAdminDashboardService";
import { useAuditLogService, type AuditLogResponse } from "../../../services/useAuditLogService";
import { useAuthenticatedUser } from "../../../contexts/AuthenticatedUserContext";
import { UserTypeEnum } from "../../../utils/enums";
import { formatDateTime, getErrorMessage, formatEnumLabel} from "../../../utils/helper";

const STAT_CARD_COUNT = 4;

interface ControlLink {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const CONTROL_LINKS: ControlLink[] = [
  { label: "Platform Settings", description: "Emergency radius, timeouts, platform identity", icon: <FiSettings size={20} />, path: "/admin/platform-settings" },
  { label: "Roles & Permissions", description: "Define admin roles and what they can do", icon: <FiShield size={20} />, path: "/admin/roles-permissions" },
  { label: "Audit Log", description: "Every sensitive action, who did it, and when", icon: <FiFileText size={20} />, path: "/admin/audit-log" },
  { label: "Color Themes", description: "The palette every portal renders through", icon: <FiDroplet size={20} />, path: "/admin/color-themes" },
];

/**
 * Admin/Super-Admin home (Prompt 95) - a StatCard/ActivityFeed-style overview wired to
 * GET /api/v1/dashboard/stats (DASHBOARD_VIEW-gated, Prompt 94). No timeseries/charts here
 * unlike ~/ElderSphere/eldersphere-fe's own Dashboard.page.tsx reference - that stats
 * endpoint has no equivalent history data (just current counts), so this stays a single
 * snapshot rather than fabricating a trend it can't actually show.
 *
 * Super-Admin viewers additionally get a "Platform Control" quick-link panel (the three
 * pages gated ROLE_MANAGE/CONFIG_MANAGE - Super-Admin-only in practice - plus Color
 * Themes) and a Recent Activity feed off the audit log (also ROLE_MANAGE-gated, so never
 * fetched for a plain Admin viewer - that call would just 403).
 */
const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuthenticatedUser();
  const isSuperAdmin = user?.primaryRole === UserTypeEnum.SUPER_ADMIN;
  const dashboardService = useAdminDashboardService();
  const auditLogService = useAuditLogService();

  const [stats, setStats] = useState<AdminDashboardStatsResponse | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardService.getStats(),
      isSuperAdmin ? auditLogService.search({ page: 0, size: 5, sort: "timestamp,desc" }) : Promise.resolve(null),
    ])
      .then(([statsResult, activityResult]) => {
        setStats(statsResult);
        if (activityResult) setRecentActivity(activityResult.content);
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load dashboard stats")))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const maxRoleCount = stats ? Math.max(1, ...Object.values(stats.activeUsersByRole)) : 1;

  return (
    <Box>
      <Typography variant="h5" component="h1" fontWeight={800} gutterBottom>
        Platform Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isSuperAdmin ? "Full platform control, at a glance." : "Platform activity and what needs your attention."}
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
              <StatCard
                label="Bookings This Week"
                value={stats.bookingsThisWeek}
                icon={<FiCalendar />}
                accentColor={theme.palette.primary.main}
                onClick={() => navigate("/admin/bookings")}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label="Open Emergency Alerts"
                value={stats.openEmergencyAlerts}
                icon={<FiAlertTriangle />}
                accentColor={stats.openEmergencyAlerts > 0 ? theme.palette.error.main : theme.palette.success.dark}
                onClick={() => navigate("/admin/emergency-alerts")}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label="Overdue Alerts"
                value={stats.overdueEmergencyAlerts}
                icon={<FiClock />}
                accentColor={stats.overdueEmergencyAlerts > 0 ? theme.palette.error.main : theme.palette.success.dark}
                onClick={() => navigate("/admin/emergency-alerts")}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label="Pending Caretaker Verifications"
                value={stats.pendingCaretakerVerifications}
                icon={<FiCheckCircle />}
                accentColor={stats.pendingCaretakerVerifications > 0 ? theme.palette.warning.dark : theme.palette.success.dark}
                onClick={() => navigate("/admin/caretaker-verification")}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} mb={isSuperAdmin ? 3 : 0}>
            <Grid size={{ xs: 12, md: isSuperAdmin ? 6 : 12 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <FiUsers size={18} />
                    <Typography variant="h6" fontWeight={700}>
                      Active Users by Role
                    </Typography>
                  </Stack>
                  <Stack spacing={2}>
                    {Object.entries(stats.activeUsersByRole).map(([role, count]) => (
                      <Box key={role} sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/users?userType=${role}`)}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight={600}>
                            {formatEnumLabel(role)}
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {count.toLocaleString()}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={(count / maxRoleCount) * 100}
                          sx={{
                            height: 8,
                            borderRadius: 999,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            "& .MuiLinearProgress-bar": { borderRadius: 999, bgcolor: theme.palette.primary.main },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {isSuperAdmin && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FiFileText size={18} />
                        <Typography variant="h6" fontWeight={700}>
                          Recent Activity
                        </Typography>
                      </Stack>
                      <Chip
                        size="small"
                        variant="outlined"
                        label="View full log"
                        icon={<FiArrowRight size={12} />}
                        onClick={() => navigate("/admin/audit-log")}
                        sx={{ cursor: "pointer" }}
                      />
                    </Stack>
                    {recentActivity.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                        No activity recorded yet.
                      </Typography>
                    ) : (
                      <List disablePadding>
                        {recentActivity.map((entry) => (
                          <ListItem key={entry.id} disableGutters divider>
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip size="small" label={formatEnumLabel(entry.actionType)} color="primary" variant="outlined" />
                                  <Typography variant="body2" component="span">
                                    {formatEnumLabel(entry.entityType)} #{entry.entityId}
                                  </Typography>
                                </Stack>
                              }
                              secondary={`${entry.actorEmail ?? (entry.actorUserId ? `User #${entry.actorUserId}` : "System")} · ${formatDateTime(entry.timestamp)}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          {isSuperAdmin && (
            <>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                Platform Control
              </Typography>
              <Grid container spacing={2}>
                {CONTROL_LINKS.map((link) => (
                  <Grid key={link.label} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      onClick={() => navigate(link.path)}
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
                            bgcolor: alpha(theme.palette.secondary.main, 0.2),
                            color: "secondary.dark",
                          }}
                        >
                          {link.icon}
                        </Box>
                        <Typography fontWeight={700}>{link.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {link.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </>
      ) : null}
    </Box>
  );
};

export default AdminDashboardPage;
