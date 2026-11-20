import React, { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import { FiCalendar, FiCopy, FiRefreshCw } from "react-icons/fi";
import TextField from "../../atoms/TextField/TextField";
import Button from "../../atoms/Button/Button";
import ConfirmDialog from "../../atoms/ConfirmDialog/ConfirmDialog";
import { useCalendarService } from "../../../services/useCalendarService";
import { getErrorMessage } from "../../../utils/helper";

/**
 * Prompt 107 - the frontend half of Prompt 106's .ics export. Fetches/shows the
 * caretaker's own subscribable calendar URL (GET .../me/calendar-link, lazily created
 * server-side on first fetch) with a copy button and brief per-provider instructions, plus
 * a "Regenerate link" action behind a confirmation dialog (the backend immediately
 * invalidates the OLD token on regenerate, so this warns before doing something
 * irreversible for anyone who already subscribed with the old link).
 */
const CaretakerCalendarSync: React.FC = () => {
  const calendarService = useCalendarService();

  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    calendarService
      .getCalendarLink()
      .then((response) => setIcsUrl(response.icsUrl))
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load your calendar link")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async () => {
    if (!icsUrl) return;
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied/unavailable - non-critical, nothing to recover from.
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setActionError(null);
    try {
      const response = await calendarService.regenerateCalendarLink();
      setIcsUrl(response.icsUrl);
      setConfirmOpen(false);
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not regenerate your calendar link"));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <FiCalendar size={18} />
          <Typography variant="h6" fontWeight={700}>
            Sync to Your Calendar
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Subscribe to this link in Google Calendar or Outlook to see your upcoming confirmed bookings automatically - new and updated
          bookings appear the next time your calendar app refreshes.
        </Typography>

        {loading && <Skeleton variant="rounded" height={56} />}
        {loadError && <Alert severity="error">{loadError}</Alert>}
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {actionError}
          </Alert>
        )}

        {icsUrl && (
          <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} mb={2}>
              <TextField
                label="Calendar URL"
                value={icsUrl}
                slotProps={{ input: { readOnly: true } }}
                onFocus={(e) => e.target.select()}
              />
              <Button variant="outlined" startIcon={<FiCopy size={16} />} onClick={handleCopy} sx={{ flexShrink: 0 }}>
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </Stack>

            <Box mb={2}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                How to subscribe
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Google Calendar:</strong> Settings → Add calendar → From URL → paste this link.
                <br />
                <strong>Outlook:</strong> Add calendar → Subscribe from web → paste this link.
              </Typography>
            </Box>

            <Button variant="text" color="error" startIcon={<FiRefreshCw size={16} />} onClick={() => setConfirmOpen(true)}>
              Regenerate Link
            </Button>
          </>
        )}

        <ConfirmDialog
          open={confirmOpen}
          title="Regenerate calendar link?"
          description="Your current link will stop working immediately, including in any calendar app you've already subscribed with. You'll need to re-subscribe there with the new link."
          confirmLabel="Regenerate"
          confirming={regenerating}
          onConfirm={handleRegenerate}
          onClose={() => setConfirmOpen(false)}
        />
      </CardContent>
    </Card>
  );
};

export default CaretakerCalendarSync;
