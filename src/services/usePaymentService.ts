import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { PaymentStatusEnum } from "../utils/enums";

const PAYMENT_URLS = {
  INTENT: "/api/v1/payments/intent",
  BY_ID: "/api/v1/payments/:id",
  BY_BOOKING: "/api/v1/payments/booking/:bookingId",
};

// Mirrors com.elderhive.dtos.Payment.CreatePaymentIntentResponse field-for-field.
export interface CreatePaymentIntentResponse {
  paymentId: number;
  clientSecret: string;
  amount: number;
  currency: string;
}

// Mirrors com.elderhive.dtos.Payment.PaymentResponse field-for-field.
export interface PaymentResponse {
  id: number;
  bookingId: number;
  amount: number;
  currency: string;
  status: PaymentStatusEnum;
  stripePaymentIntentId?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Payments are additive (Prompt 97) - nothing here is ever a precondition for any
// useBookingService.ts call. ROLE_MANAGE-style gating doesn't apply; every endpoint here
// is isAuthenticated()-only server-side, restricted per-row to the payment's own booking's
// family party, assigned caretaker, or admin (PaymentServiceImpl#assertCanView).
export const usePaymentService = () => {
  return useMemo(
    () => ({
      createIntent: (bookingId: number) =>
        request<CreatePaymentIntentResponse>("POST", PAYMENT_URLS.INTENT, { bookingId }),
      getById: (id: number) => request<PaymentResponse>("GET", replaceUrlParams(PAYMENT_URLS.BY_ID, { id })),
      // Most recent attempt first (see PaymentController#getByBooking) - callers that just
      // want "the current state" should read index 0.
      getByBooking: (bookingId: number) =>
        request<PaymentResponse[]>("GET", replaceUrlParams(PAYMENT_URLS.BY_BOOKING, { bookingId })),
    }),
    []
  );
};
