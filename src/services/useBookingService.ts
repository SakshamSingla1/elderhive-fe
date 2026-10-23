import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";
import type { BookingStatusEnum } from "../utils/enums";

const BOOKING_URLS = {
  BASE: "/api/v1/bookings",
  BY_ID: "/api/v1/bookings/:id",
  CONFIRM: "/api/v1/bookings/:id/confirm",
  START: "/api/v1/bookings/:id/start",
  COMPLETE: "/api/v1/bookings/:id/complete",
  CANCEL: "/api/v1/bookings/:id/cancel",
  MINE_AS_FAMILY: "/api/v1/bookings/me/as-family",
  MINE_AS_CARETAKER: "/api/v1/bookings/me/as-caretaker",
  RECURRING_GROUP: "/api/v1/bookings/recurring-group/:recurringGroupId",
  ADMIN_OVERRIDE_STATUS: "/api/v1/bookings/:id/admin-override-status",
};

// Mirrors com.elderhive.dtos.Booking.BookingResponse field-for-field.
export interface BookingResponse extends AuditableResponse {
  id: number;
  familyUserId: number;
  elderProfileId: number;
  elderName: string | null;
  caretakerId: number;
  caretakerName: string | null;
  // Added Prompt 92 - the caretaker's own user id, distinct from `caretakerId` above
  // (their CaretakerProfile's id) - lets a booking be matched against
  // usePresenceService's status map and used to start a Messaging conversation (both
  // keyed by user id, not CaretakerProfile id).
  caretakerUserId: number | null;
  serviceOfferingId: number;
  serviceName: string | null;
  scheduledDate: string;
  scheduledTime: string;
  status: BookingStatusEnum;
  cost: number | null;
  notes: string | null;
  recurringGroupId: string | null;
}

// Mirrors com.elderhive.dtos.Booking.BookingRequest field-for-field. There's no
// familyUserId here - the backend always infers the caller from the auth cookie
// (BookingServiceImpl#create, Prompt 77), never a client-supplied value.
export interface BookingPayload {
  elderProfileId: number;
  caretakerId: number;
  serviceOfferingId: number;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
  // When true, creates one booking per week for `occurrences` weeks (2-12, enforced
  // server-side) sharing one recurringGroupId. `occurrences` is ignored otherwise.
  recurring?: boolean;
  occurrences?: number;
}

export interface BookingFilterParams {
  familyUserId?: number;
  caretakerId?: number;
  status?: BookingStatusEnum;
  page?: number;
  size?: number;
}

// Booking lifecycle CRUD (BookingController, Prompt 77) - confirm/start/complete are
// caretaker-only server-side, cancel's family-vs-caretaker permission depends on the
// booking's current status (see BookingServiceImpl#assertCanCancel's own javadoc) - this
// project has no FE-side fine-grained-permission check yet (same documented limitation as
// every other service hook here), so an unauthorized caller just gets a 403 surfaced the
// usual way.
export const useBookingService = () => {
  return useMemo(
    () => ({
      create: (payload: BookingPayload) => request<BookingResponse>("POST", BOOKING_URLS.BASE, payload),
      getById: (id: number) => request<BookingResponse>("GET", replaceUrlParams(BOOKING_URLS.BY_ID, { id })),
      confirm: (id: number) => request<BookingResponse>("PUT", replaceUrlParams(BOOKING_URLS.CONFIRM, { id })),
      start: (id: number) => request<BookingResponse>("PUT", replaceUrlParams(BOOKING_URLS.START, { id })),
      complete: (id: number) => request<BookingResponse>("PUT", replaceUrlParams(BOOKING_URLS.COMPLETE, { id })),
      // cancelSeries also cancels every other booking sharing this one's recurringGroupId
      // (a no-op for those beyond this one if it has none) - matches BookingController's
      // own single-endpoint-plus-query-param design (Prompt 77), not two separate routes.
      cancel: (id: number, cancelSeries = false) =>
        request<BookingResponse>("PUT", replaceUrlParams(BOOKING_URLS.CANCEL, { id }), null, { params: { cancelSeries } }),
      getMyBookingsAsFamily: (page = 0, size = 20) =>
        request<PageResponse<BookingResponse>>("GET", BOOKING_URLS.MINE_AS_FAMILY, null, {
          params: { page, size, sort: "scheduledDate,desc" },
        }),
      getMyBookingsAsCaretaker: (page = 0, size = 20) =>
        request<PageResponse<BookingResponse>>("GET", BOOKING_URLS.MINE_AS_CARETAKER, null, {
          params: { page, size, sort: "scheduledDate,desc" },
        }),
      getRecurringGroup: (recurringGroupId: string) =>
        request<BookingResponse[]>("GET", replaceUrlParams(BOOKING_URLS.RECURRING_GROUP, { recurringGroupId })),
      // Admin oversight (BOOKING_MANAGE-gated server-side, Prompt 80) - every booking on
      // the platform, optionally filtered. Not scoped to the caller at all, unlike
      // getMyBookingsAsFamily/AsCaretaker above.
      getAll: (filters: BookingFilterParams = {}) => {
        const { page = 0, size = 20, familyUserId, caretakerId, status } = filters;
        return request<PageResponse<BookingResponse>>("GET", BOOKING_URLS.BASE, null, {
          params: { page, size, familyUserId, caretakerId, status, sort: "scheduledDate,desc" },
        });
      },
      // Admin-only (BOOKING_MANAGE-gated server-side) - sets a booking to ANY status
      // directly, bypassing confirm/start/complete/cancel's own linear-lifecycle gate.
      adminOverrideStatus: (id: number, status: BookingStatusEnum) =>
        request<BookingResponse>("PUT", replaceUrlParams(BOOKING_URLS.ADMIN_OVERRIDE_STATUS, { id }), { status }),
    }),
    []
  );
};
