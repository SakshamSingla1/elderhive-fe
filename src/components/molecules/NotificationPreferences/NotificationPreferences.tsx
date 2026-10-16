import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { FiBellOff, FiBell } from "react-icons/fi";
import {
  useNotificationPreferenceService,
  type NotificationPreferenceDTO,
} from "../../../services/useNotificationPreferenceService";
import { useWebPushSubscription } from "../../../hooks/useWebPushSubscription";
import { NotificationTypeEnum } from "../../../utils/enums";
import { getErrorMessage } from "../../../utils/helper";

// Friendly copy for each backend NotificationTypeEnum value.
const TYPE_LABELS: Record<NotificationTypeEnum, string> = {
  [NotificationTypeEnum.BOOKING]: "Bookings",
  [NotificationTypeEnum.EMERGENCY]: "Emergency Alerts",
  [NotificationTypeEnum.ACCOUNT]: "Account",
  [NotificationTypeEnum.SYSTEM]: "System",
};

const CHANNELS: { key: keyof NotificationPreferenceDTO; label: string }[] = [
  { key: "inAppEnabled", label: "In-App" },
  { key: "emailEnabled", label: "Email" },
  { key: "smsEnabled", label: "SMS" },
  { key: "webPushEnabled", label: "Push" },
];

// Mounted on AccountSettings.page.tsx (shared across every role). Two independent controls:
//  1. Per-notification-type channel toggles (In-App/Email/SMS/Push) — GET/PUT
//     /api/v1/notification-preferences. Each toggle saves itself immediately rather than a
//     separate Save button, since there's no multi-field form here.
//  2. A device-level "Enable push notifications" toggle — the actual browser Notification
//     permission + pushManager.subscribe() flow (see hooks/useWebPushSubscription).
//     Independent of the per-type Push column above: that column only controls whether THIS
//     type is allowed to push once the device is subscribed at all.
const NotificationPreferences: React.FC = () => {
  const notificationPreferenceService = useNotificationPreferenceService();
  const push = useWebPushSubscription();

  const [preferences, setPreferences] = useState<NotificationPreferenceDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    notificationPreferenceService
      .getPreferences()
      .then(setPreferences)
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load notification preferences")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleChannel = async (type: NotificationTypeEnum, channelKey: keyof NotificationPreferenceDTO) => {
    if (!preferences) return;
    const rowIndex = preferences.findIndex((p) => p.type === type);
    if (rowIndex === -1) return;
    const cellKey = `${type}:${channelKey}`;
    const previous = preferences;
    const updatedRow: NotificationPreferenceDTO = { ...preferences[rowIndex], [channelKey]: !preferences[rowIndex][channelKey] };
    const next = [...preferences];
    next[rowIndex] = updatedRow;
    setPreferences(next);
    setSavingKey(cellKey);
    setSaveError(null);
    try {
      await notificationPreferenceService.updatePreferences([updatedRow]);
    } catch (err) {
      setPreferences(previous);
      setSaveError(getErrorMessage(err, "Could not update this preference"));
    } finally {
      setSavingKey(null);
    }
  };

  const pushStatusChip = () => {
    switch (push.status) {
      case "subscribed":
        return <Chip label="Enabled" color="success" size="small" />;
      case "denied":
        return <Chip label="Blocked by browser" color="error" size="small" />;
      case "unsupported":
        return <Chip label="Not supported" size="small" />;
      case "checking":
        return <Chip label="Checking…" size="small" />;
      default:
        return <Chip label="Disabled" size="small" />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={2} sx={{ color: "primary.main" }}>
          <FiBell size={20} />
          <Typography variant="h6" fontWeight={800} color="text.primary">
            Notification Preferences
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Push notifications on this device
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {push.status === "denied"
                ? "Notifications are blocked for this site in your browser settings."
                : push.status === "unsupported"
                ? "Your browser doesn't support push notifications."
                : "Get real-time alerts even when ElderHive isn't open."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {pushStatusChip()}
            {push.status !== "unsupported" && push.status !== "denied" && (
              <Button
                variant={push.status === "subscribed" ? "outlined" : "contained"}
                size="small"
                disabled={push.busy}
                startIcon={push.status === "subscribed" ? <FiBellOff size={14} /> : <FiBell size={14} />}
                onClick={push.status === "subscribed" ? push.unsubscribe : push.subscribe}
              >
                {push.status === "subscribed" ? "Disable" : "Enable"}
              </Button>
            )}
          </Stack>
        </Stack>

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : loadError ? (
          <Alert severity="error">{loadError}</Alert>
        ) : !preferences || preferences.length === 0 ? (
          <Typography color="text.secondary">No notification types configured yet.</Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Notification</TableCell>
                  {CHANNELS.map((c) => (
                    <TableCell key={c.key} align="center">
                      {c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {preferences.map((pref) => (
                  <TableRow key={pref.type}>
                    <TableCell>{TYPE_LABELS[pref.type] ?? pref.type}</TableCell>
                    {CHANNELS.map((c) => {
                      const cellKey = `${pref.type}:${c.key}`;
                      return (
                        <TableCell key={c.key} align="center">
                          <Switch
                            size="small"
                            checked={Boolean(pref[c.key])}
                            disabled={savingKey === cellKey}
                            onChange={() => toggleChannel(pref.type, c.key)}
                            slotProps={{ input: { "aria-label": `${TYPE_LABELS[pref.type] ?? pref.type} — ${c.label}` } }}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
