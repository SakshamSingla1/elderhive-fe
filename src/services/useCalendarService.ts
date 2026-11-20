import { useMemo } from "react";
import { request } from ".";

const CALENDAR_URLS = {
  LINK: "/api/v1/caretakers/me/calendar-link",
  REGENERATE: "/api/v1/caretakers/me/calendar-link/regenerate",
};

// Mirrors com.elderhive.dtos.CaretakerCalendar.CalendarLinkResponse field-for-field.
export interface CalendarLinkResponseDTO {
  icsUrl: string;
}

export const useCalendarService = () => {
  return useMemo(
    () => ({
      getCalendarLink: () => request<CalendarLinkResponseDTO>("GET", CALENDAR_URLS.LINK),
      regenerateCalendarLink: () => request<CalendarLinkResponseDTO>("POST", CALENDAR_URLS.REGENERATE),
    }),
    []
  );
};
