import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { useMetaConfigService, type MetaConfigResponse } from "../../../services/useMetaConfigService";
import { getErrorMessage } from "../../../utils/helper";

interface RowState {
  /** The textarea's current (possibly unsaved/invalid) contents — independent of the
   *  last-saved MetaConfigResponse so a typo mid-edit never gets silently discarded. */
  text: string;
  error: string | null;
  saving: boolean;
  saved: boolean;
}

function prettyPrintOrRaw(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function buildRowState(configs: MetaConfigResponse[]): Record<string, RowState> {
  const next: Record<string, RowState> = {};
  for (const config of configs) {
    next[config.context] = { text: prettyPrintOrRaw(config.data), error: null, saving: false, saved: false };
  }
  return next;
}

// A generic JSON editor per context — deliberately not a bespoke form per
// EMERGENCY_SETTINGS/PLATFORM_SETTINGS field set, per this prompt's explicit MVP scope.
// Lists whatever GET /meta-configs actually returns (today: the two contexts
// MetaConfigSeeder seeds, Prompt 37) rather than a hardcoded list of "known" context
// names here — new contexts a later phase adds show up automatically, no FE change
// needed, same "never hardcode, always read through the service" principle the backend
// itself follows.
const PlatformSettingsPage: React.FC = () => {
  const metaConfigService = useMetaConfigService();
  const [configs, setConfigs] = useState<MetaConfigResponse[]>([]);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    metaConfigService
      .list()
      .then((result) => {
        if (cancelled) return;
        setConfigs(result);
        setRowState(buildRowState(result));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, "Could not load platform settings."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTextChange = (context: string, text: string) => {
    setRowState((prev) => ({ ...prev, [context]: { ...prev[context], text, error: null, saved: false } }));
  };

  const handleSave = async (context: string) => {
    const current = rowState[context];
    if (!current) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(current.text);
    } catch {
      setRowState((prev) => ({ ...prev, [context]: { ...prev[context], error: "Invalid JSON — please fix before saving." } }));
      return;
    }

    setRowState((prev) => ({ ...prev, [context]: { ...prev[context], saving: true, error: null, saved: false } }));
    try {
      const updated = await metaConfigService.upsert(context, { data: JSON.stringify(parsed) });
      setConfigs((prev) => prev.map((c) => (c.context === context ? updated : c)));
      setRowState((prev) => ({
        ...prev,
        [context]: { text: prettyPrintOrRaw(updated.data), error: null, saving: false, saved: true },
      }));
    } catch (err) {
      setRowState((prev) => ({
        ...prev,
        [context]: { ...prev[context], saving: false, error: getErrorMessage(err, "Could not save this setting.") },
      }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
        Platform Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Edit the raw JSON for each configuration context below. These values are read by
        name elsewhere in the app (e.g. the emergency flow's search radius) — never
        hardcoded — so a change here takes effect without a redeploy.
      </Typography>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}

      {!loadError && configs.length === 0 && (
        <Alert severity="info">No configuration contexts exist yet.</Alert>
      )}

      <Stack spacing={3}>
        {configs.map((config) => {
          const state = rowState[config.context];
          if (!state) return null;
          return (
            <Card key={config.context} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                  <Chip label={config.context} size="small" color="primary" variant="outlined" />
                  {config.updatedAt && (
                    <Typography variant="caption" color="text.secondary">
                      Last updated {new Date(config.updatedAt).toLocaleString()}
                    </Typography>
                  )}
                </Stack>

                {state.error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {state.error}
                  </Alert>
                )}
                {state.saved && !state.error && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Saved.
                  </Alert>
                )}

                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  value={state.text}
                  onChange={(e) => handleTextChange(config.context, e.target.value)}
                  slotProps={{ htmlInput: { style: { fontFamily: "monospace", fontSize: 13 } } }}
                />

                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Button variant="contained" onClick={() => handleSave(config.context)} disabled={state.saving}>
                    {state.saving ? "Saving…" : "Save"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
};

export default PlatformSettingsPage;
