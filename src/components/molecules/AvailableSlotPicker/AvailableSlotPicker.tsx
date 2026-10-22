import React, { useEffect, useState } from "react";
import { Box, Chip, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { useCaretakerService } from "../../../services/useCaretakerService";
import type { CaretakerAvailabilitySlotDTO } from "../../../services/useCaretakerService";
import { formatTime, getErrorMessage } from "../../../utils/helper";

export interface AvailableSlotPickerProps {
  caretakerId: number | null;
  serviceOfferingId: number | null;
  /** ISO date, "yyyy-MM-dd". */
  date: string | null;
  /** Selected slot's start time, "HH:mm:ss" - null when nothing is picked yet. */
  value: string | null;
  onChange: (time: string) => void;
}

const DEFAULT_WINDOW_START = "09:00:00";
const DEFAULT_WINDOW_END = "18:00:00";

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTimeString(minutesSinceMidnight: number): string {
  const hours = String(Math.floor(minutesSinceMidnight / 60)).padStart(2, "0");
  const minutes = String(minutesSinceMidnight % 60).padStart(2, "0");
  return `${hours}:${minutes}:00`;
}

/** Every slotDurationMinutes-sized start time that fits inside [start, end). */
function generateCandidateSlots(start: string, end: string, slotDurationMinutes: number): string[] {
  const candidates: string[] = [];
  const endMinutes = toMinutes(end);
  for (let cursor = toMinutes(start); cursor + slotDurationMinutes <= endMinutes; cursor += slotDurationMinutes) {
    candidates.push(toTimeString(cursor));
  }
  return candidates;
}

/**
 * Chip grid of real bookable times for one caretaker/date/service combination -
 * GET /caretaker-profiles/{id}/available-slots (Prompt 76) only returns the FREE slots
 * (unlike ElderSphere's own reference, which returns every candidate pre-flagged
 * available/unavailable), so this reconstructs the full candidate grid itself: the
 * caretaker's own weekly CaretakerAvailability windows for that day of week (Prompt 70's
 * getAvailability, already fetched here rather than threading it down from a parent that
 * doesn't otherwise need it), or the documented 9am-6pm default when usingDefaultHours is
 * true (mirrors AvailableSlotServiceImpl's own DEFAULT_WINDOW_START/END constants exactly).
 * Any candidate not present in the backend's availableSlots list is rendered disabled -
 * already booked, from the caller's point of view.
 */
const AvailableSlotPicker: React.FC<AvailableSlotPickerProps> = ({ caretakerId, serviceOfferingId, date, value, onChange }) => {
  const caretakerService = useCaretakerService();
  const [candidates, setCandidates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Set<string>>(new Set());
  const [usingDefaultHours, setUsingDefaultHours] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caretakerId || !serviceOfferingId || !date) {
      setCandidates([]);
      setAvailableSlots(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      caretakerService.getAvailableSlots(caretakerId, date, serviceOfferingId),
      caretakerService.getAvailability(caretakerId),
    ])
      .then(([slotsResult, weeklySchedule]) => {
        if (cancelled) return;
        setAvailableSlots(new Set(slotsResult.availableSlots));
        setUsingDefaultHours(slotsResult.usingDefaultHours);

        const windows: CaretakerAvailabilitySlotDTO[] = slotsResult.usingDefaultHours
          ? [{ id: 0, caretakerId, dayOfWeek: slotsResult.dayOfWeek, startTime: DEFAULT_WINDOW_START, endTime: DEFAULT_WINDOW_END }]
          : weeklySchedule.filter((slot) => slot.dayOfWeek === slotsResult.dayOfWeek);

        const generated = windows.flatMap((window) =>
          generateCandidateSlots(window.startTime, window.endTime, slotsResult.slotDurationMinutes)
        );
        setCandidates([...new Set(generated)].sort());
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Could not load available time slots"));
        setCandidates([]);
        setAvailableSlots(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caretakerId, serviceOfferingId, date]);

  if (!caretakerId || !serviceOfferingId || !date) {
    return (
      <Typography variant="body2" color="text.secondary">
        Pick a caretaker and a date to see available times.
      </Typography>
    );
  }

  if (loading) {
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={88} height={32} sx={{ borderRadius: "16px" }} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error}
      </Typography>
    );
  }

  if (candidates.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        This caretaker has no bookable hours on this day.
      </Typography>
    );
  }

  return (
    <Box>
      {usingDefaultHours && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          This caretaker hasn't set specific hours for this day - showing default 9am-6pm availability.
        </Typography>
      )}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {candidates.map((candidate) => {
          const isAvailable = availableSlots.has(candidate);
          const isSelected = value === candidate;
          const chip = (
            <Chip
              key={candidate}
              label={formatTime(candidate)}
              clickable={isAvailable}
              disabled={!isAvailable}
              color={isSelected ? "primary" : "default"}
              variant={isSelected ? "filled" : "outlined"}
              onClick={isAvailable ? () => onChange(candidate) : undefined}
            />
          );
          if (isAvailable) return chip;
          return (
            <Tooltip key={candidate} title="Already booked">
              <span>{chip}</span>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
};

export default AvailableSlotPicker;
