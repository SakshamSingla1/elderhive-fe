import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { DAYS_OF_WEEK, DayOfWeekShortLabels } from "../../../utils/enums";
import type { CaretakerAvailabilitySlotDTO } from "../../../services/useCaretakerService";

export interface WeeklyAvailabilityViewProps {
  slots: CaretakerAvailabilitySlotDTO[];
}

/**
 * Compact read-only weekly schedule — iterates DAYS_OF_WEEK (calendar order) rather than
 * trusting the order `slots` arrives in, since the backend's own
 * findByCaretakerIdOrderByDayOfWeekAscStartTimeAsc query sorts the day_of_week column
 * alphabetically, not Monday-first (see that constant's own comment). Used on the admin
 * CaretakerVerification review page so an admin can see a caretaker's stated schedule
 * as context before approving/rejecting their documents.
 */
const WeeklyAvailabilityView: React.FC<WeeklyAvailabilityViewProps> = ({ slots }) => {
  if (slots.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        This caretaker hasn't shared their weekly availability yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.75}>
      {DAYS_OF_WEEK.map((day) => {
        const daySlots = slots.filter((s) => s.dayOfWeek === day);
        return (
          <Box key={day} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="body2" fontWeight={700} sx={{ width: 44, flexShrink: 0 }}>
              {DayOfWeekShortLabels[day]}
            </Typography>
            {daySlots.length === 0 ? (
              <Typography variant="body2" color="text.disabled">
                Unavailable
              </Typography>
            ) : (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {daySlots.map((slot) => (
                  <Chip key={slot.id} size="small" variant="outlined" label={`${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`} />
                ))}
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );
};

export default WeeklyAvailabilityView;
