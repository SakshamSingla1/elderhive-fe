import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";

const REVIEW_URLS = {
  BASE: "/api/v1/reviews",
  BY_CARETAKER: "/api/v1/reviews/caretaker/:caretakerId",
  BY_BOOKING: "/api/v1/reviews/booking/:bookingId",
  REPLY: "/api/v1/reviews/:reviewId/reply",
};

// Mirrors com.elderhive.dtos.Review.ReviewReplyResponse field-for-field.
export interface ReviewReplyResponse extends AuditableResponse {
  id: number;
  reviewId: number;
  caretakerId: number;
  content: string;
}

// Mirrors com.elderhive.dtos.Review.ReviewResponse field-for-field.
export interface ReviewResponse extends AuditableResponse {
  id: number;
  bookingId: number;
  reviewerUserId: number;
  reviewerName: string | null;
  caretakerId: number;
  caretakerName: string | null;
  overallRating: number;
  comment: string | null;
  punctualityRating: number | null;
  careQualityRating: number | null;
  communicationRating: number | null;
  photoFileAssetId: number | null;
  photoUrl: string | null;
  reply: ReviewReplyResponse | null;
}

// Mirrors com.elderhive.dtos.Review.ReviewRequest field-for-field. photoFileAssetId stays
// here as an optional field (the backend/entity support it), but no page in this prompt
// ever sets it — ElderHive has no generic file-upload REST endpoint a FAMILY_MEMBER can
// call yet (FileController only exposes a download redirect for an already-existing
// FileAsset; its own javadoc is explicit that making it a general-purpose upload target
// needs its own, separately-considered access rule). Revisit once that endpoint exists.
export interface ReviewPayload {
  bookingId: number;
  overallRating: number;
  comment?: string;
  punctualityRating?: number;
  careQualityRating?: number;
  communicationRating?: number;
  photoFileAssetId?: number;
}

export const useReviewService = () => {
  return useMemo(
    () => ({
      create: (payload: ReviewPayload) => request<ReviewResponse>("POST", REVIEW_URLS.BASE, payload),
      // Every review a caretaker has received, newest first.
      getByCaretaker: (caretakerId: number, page = 0, size = 10) =>
        request<PageResponse<ReviewResponse>>("GET", replaceUrlParams(REVIEW_URLS.BY_CARETAKER, { caretakerId }), null, {
          params: { page, size },
        }),
      // Throws a 404 (REVIEW_NOT_FOUND) when the booking hasn't been reviewed yet — that's
      // a normal, expected outcome here, not a real error (same contract
      // ReviewController's own getByBookingId() documents server-side); callers should
      // catch it and treat it as "no review exists".
      getByBooking: (bookingId: number) => request<ReviewResponse>("GET", replaceUrlParams(REVIEW_URLS.BY_BOOKING, { bookingId })),
      // Upsert server-side, but Caretaker/Reviews.page.tsx only ever calls this once per
      // review — see its own "one reply per review" UI note.
      reply: (reviewId: number, content: string) =>
        request<ReviewReplyResponse>("PUT", replaceUrlParams(REVIEW_URLS.REPLY, { reviewId }), { content }),
    }),
    []
  );
};
