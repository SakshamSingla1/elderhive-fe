import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Chip, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import TextField from "../../atoms/TextField/TextField";
import { useCaretakerService, type CaretakerAvailabilitySlotDTO } from "../../../services/useCaretakerService";
import { DAYS_OF_WEEK, DayOfWeekShortLabels, type DayOfWeekEnum } from "../../../utils/enums";
import { getErrorMessage } from "../../../utils/helper";

export interface WeeklyAvailabilityEditorProps {
  caretakerId: number;
}

type DraftKey = number | "new";

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

/**
 * Self-contained, unlike ElderSphere's own WeeklyAvailabilityEditor (a dumb
 * controlled-value component emitting a whole replace-all list on every change) -
 * CaretakerAvailabilityController (Prompt 66) is per-row CRUD, not a replace-all PUT, so
 * this component owns its own fetch + add/update/remove calls, the same self-contained
 * shape FamilyMembersPanel.tsx (Prompt 69) already established for a sibling molecule
 * with real backend mutations behind it. Days with zero slots still render (as
 * "Unavailable") so every one of the 7 is always visible, matching the editor's own
 * "7 rows (Mon-Sun)" design intent from the reference.
 */
const WeeklyAvailabilityEditor: React.FC<WeeklyAvailabilityEditorProps> = ({ caretakerId }) => {
  const caretakerService = useCaretakerService();

  const [slots, setSlots] = useState<CaretakerAvailabilitySlotDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingKey, setEditingKey] = useState<DraftKey | null>(null);
  const [draftDay, setDraftDay] = useState<DayOfWeekEnum>(DAYS_OF_WEEK[0]);
  const [draftStart, setDraftStart] = useState(DEFAULT_START);
  const [draftEnd, setDraftEnd] = useState(DEFAULT_END);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    caretakerService
      .getAvailability(caretakerId)
      .then(setSlots)
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load your availability")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caretakerId]);

  useEffect(() => {
    load();
  }, [load]);

  const startAdd = (day: DayOfWeekEnum) => {
    setEditingKey("new");
    setDraftDay(day);
    setDraftStart(DEFAULT_START);
    setDraftEnd(DEFAULT_END);
    setActionError(null);
  };

  const startEdit = (slot: CaretakerAvailabilitySlotDTO) => {
    setEditingKey(slot.id);
    setDraftDay(slot.dayOfWeek);
    setDraftStart(slot.startTime.slice(0, 5));
    setDraftEnd(slot.endTime.slice(0, 5));
    setActionError(null);
  };

  const cancelEdit = () => setEditingKey(null);

  const saveDraft = async () => {
    setSaving(true);
    setActionError(null);
    const payload = { dayOfWeek: draftDay, startTime: draftStart, endTime: draftEnd };
    try {
      if (editingKey === "new") {
        const created = await caretakerService.addAvailabilitySlot(payload);
        setSlots((prev) => [...prev, created]);
      } else if (editingKey != null) {
        const updated = await caretakerService.updateAvailabilitySlot(editingKey, payload);
        setSlots((prev) => prev.map((s) => (s.id === editingKey ? updated : s)));
      }
      setEditingKey(null);
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not save this slot"));
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async (slot: CaretakerAvailabilitySlotDTO) => {
    setRemovingId(slot.id);
    setActionError(null);
    try {
      await caretakerService.removeAvailabilitySlot(slot.id);
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not remove this slot"));
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <Stack spacing={1}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={64} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {loadError && <Alert severity="error">{loadError}</Alert>}
      {actionError && <Alert severity="error">{actionError}</Alert>}

      {DAYS_OF_WEEK.map((day) => {
        const daySlots = slots.filter((s) => s.dayOfWeek === day);
        const addingToThisDay = editingKey === "new" && draftDay === day;
        return (
          <Box
            key={day}
            sx={{ p: 1.75, borderRadius: "12px", bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}
          >
            <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                {DayOfWeekShortLabels[day]}
              </Typography>
              <Chip
                label={daySlots.length === 0 ? "Unavailable" : `${daySlots.length} slot${daySlots.length > 1 ? "s" : ""}`}
                size="small"
                color={daySlots.length === 0 ? "default" : "primary"}
                variant="outlined"
              />
            </Stack>
            <Stack spacing={1}>
              {daySlots.map((slot) =>
                editingKey === slot.id ? (
                  <DraftRow
                    key={slot.id}
                    start={draftStart}
                    end={draftEnd}
                    saving={saving}
                    onStartChange={setDraftStart}
                    onEndChange={setDraftEnd}
                    onSave={saveDraft}
                    onCancel={cancelEdit}
                  />
                ) : (
                  <Stack key={slot.id} direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="body2">
                      {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                    </Typography>
                    <Box flexGrow={1} />
                    <IconButton size="small" onClick={() => startEdit(slot)} aria-label={`Edit ${day} slot`} disabled={editingKey != null}>
                      <FiEdit2 size={14} />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeSlot(slot)}
                      disabled={editingKey != null || removingId === slot.id}
                      aria-label={`Remove ${day} slot`}
                    >
                      <FiTrash2 size={14} />
                    </IconButton>
                  </Stack>
                )
              )}
              {addingToThisDay ? (
                <DraftRow
                  start={draftStart}
                  end={draftEnd}
                  saving={saving}
                  onStartChange={setDraftStart}
                  onEndChange={setDraftEnd}
                  onSave={saveDraft}
                  onCancel={cancelEdit}
                />
              ) : (
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => startAdd(day)}
                  disabled={editingKey != null}
                  sx={{ alignSelf: "flex-start" }}
                  aria-label={`Add ${day} slot`}
                >
                  <FiPlus size={16} />
                </IconButton>
              )}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};

interface DraftRowProps {
  start: string;
  end: string;
  saving: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const DraftRow: React.FC<DraftRowProps> = ({ start, end, saving, onStartChange, onEndChange, onSave, onCancel }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <TextField
      type="time"
      size="small"
      value={start}
      onChange={(e) => onStartChange(e.target.value)}
      sx={{ maxWidth: 140 }}
      fullWidth={false}
    />
    <Typography color="text.secondary">to</Typography>
    <TextField
      type="time"
      size="small"
      value={end}
      onChange={(e) => onEndChange(e.target.value)}
      sx={{ maxWidth: 140 }}
      fullWidth={false}
    />
    <IconButton size="small" color="primary" onClick={onSave} disabled={saving} aria-label="Save slot">
      <FiCheck size={16} />
    </IconButton>
    <IconButton size="small" onClick={onCancel} disabled={saving} aria-label="Cancel">
      <FiX size={16} />
    </IconButton>
  </Stack>
);

export default WeeklyAvailabilityEditor;
