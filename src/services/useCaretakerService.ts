import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { PageResponse } from "../utils/types";
import type { CaretakerVerificationStatusEnum, DayOfWeekEnum, DocumentReviewStatusEnum } from "../utils/enums";

const CARETAKER_URLS = {
  BASE: "/api/v1/caretaker-profiles",
  ME: "/api/v1/caretaker-profiles/me",
  BY_ID: "/api/v1/caretaker-profiles/:id",
  VERIFICATION_DOCUMENTS: "/api/v1/caretaker-profiles/:id/verification-documents",
  UPLOAD_VERIFICATION_DOCUMENT: "/api/v1/caretaker-profiles/me/verification-documents",
  REVIEW_VERIFICATION_DOCUMENT: "/api/v1/caretaker-verification-documents/:id/review",
  AVAILABILITY_FOR_CARETAKER: "/api/v1/caretaker-profiles/:id/availability",
  ADD_AVAILABILITY: "/api/v1/caretaker-profiles/me/availability",
  AVAILABILITY_SLOT: "/api/v1/caretaker-profiles/me/availability/:slotId",
};

// Mirrors com.elderhive.dtos.CaretakerProfile.CaretakerProfileResponse field-for-field.
export interface CaretakerProfileResponseDTO {
  id: number;
  userId: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  specialties: string[];
  yearsOfExperience: number | null;
  hourlyRate: number | null;
  ratingAverage: number | null;
  verificationStatus: CaretakerVerificationStatusEnum;
  profilePhotoFileAssetId: number | null;
  latitude: number | null;
  longitude: number | null;
  serviceRadiusKm: number | null;
  createdAt?: string;
  updatedAt?: string;
}

// Mirrors com.elderhive.dtos.CaretakerProfile.CaretakerProfileRequest - no
// verificationStatus/profilePhotoFileAssetId/ratingAverage here, none of them are
// caretaker-editable (see that DTO's own javadoc).
export interface CaretakerProfileRequestDTO {
  bio?: string | null;
  specialties?: string[];
  yearsOfExperience?: number | null;
  hourlyRate?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm?: number | null;
}

// Mirrors com.elderhive.dtos.CaretakerVerificationDocument.CaretakerVerificationDocumentResponse.
export interface CaretakerVerificationDocumentDTO {
  id: number;
  caretakerId: number;
  fileAssetId: number;
  docType: string | null;
  reviewStatus: DocumentReviewStatusEnum;
  fileUrl: string | null;
  originalFilename: string | null;
  createdAt?: string;
}

// Mirrors com.elderhive.dtos.CaretakerAvailability.CaretakerAvailabilityResponse.
export interface CaretakerAvailabilitySlotDTO {
  id: number;
  caretakerId: number;
  dayOfWeek: DayOfWeekEnum;
  startTime: string;
  endTime: string;
  createdAt?: string;
  updatedAt?: string;
}

// Mirrors com.elderhive.dtos.CaretakerAvailability.CaretakerAvailabilityRequest.
export interface CaretakerAvailabilityRequestDTO {
  dayOfWeek: DayOfWeekEnum;
  startTime: string;
  endTime: string;
}

export const useCaretakerService = () => {
  return useMemo(
    () => ({
      createOrUpdate: (payload: CaretakerProfileRequestDTO) =>
        request<CaretakerProfileResponseDTO>("POST", CARETAKER_URLS.BASE, payload),
      getMyProfile: () => request<CaretakerProfileResponseDTO>("GET", CARETAKER_URLS.ME),
      getById: (id: number) => request<CaretakerProfileResponseDTO>("GET", replaceUrlParams(CARETAKER_URLS.BY_ID, { id })),
      getAll: (page = 0, size = 20) =>
        request<PageResponse<CaretakerProfileResponseDTO>>("GET", CARETAKER_URLS.BASE, null, { params: { page, size } }),
      uploadVerificationDocument: (file: File, docType?: string) => {
        const formData = new FormData();
        formData.append("file", file);
        if (docType) formData.append("docType", docType);
        return request<CaretakerVerificationDocumentDTO>("POST", CARETAKER_URLS.UPLOAD_VERIFICATION_DOCUMENT, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      },
      listVerificationDocuments: (caretakerId: number) =>
        request<CaretakerVerificationDocumentDTO[]>("GET", replaceUrlParams(CARETAKER_URLS.VERIFICATION_DOCUMENTS, { id: caretakerId })),
      // Admin-only in practice (CARETAKER_VERIFY-gated server-side, Prompt 65) - this
      // project has no FE-side fine-grained-permission check yet (see AdminRoutes.tsx's
      // own documented precedent), so a non-permitted admin simply gets a 403 from the
      // backend when calling this, surfaced the same way any other failed request is.
      reviewVerificationDocument: (documentId: number, reviewStatus: DocumentReviewStatusEnum) =>
        request<CaretakerVerificationDocumentDTO>(
          "PUT",
          replaceUrlParams(CARETAKER_URLS.REVIEW_VERIFICATION_DOCUMENT, { id: documentId }),
          { reviewStatus }
        ),
      // Per-row CRUD, not a replace-all list (CaretakerAvailabilityController, Prompt 66) -
      // unlike ElderSphere's own reference, which models a caretaker's weekly schedule as
      // one flat "submit the whole list" PUT.
      getAvailability: (caretakerId: number) =>
        request<CaretakerAvailabilitySlotDTO[]>("GET", replaceUrlParams(CARETAKER_URLS.AVAILABILITY_FOR_CARETAKER, { id: caretakerId })),
      addAvailabilitySlot: (payload: CaretakerAvailabilityRequestDTO) =>
        request<CaretakerAvailabilitySlotDTO>("POST", CARETAKER_URLS.ADD_AVAILABILITY, payload),
      updateAvailabilitySlot: (slotId: number, payload: CaretakerAvailabilityRequestDTO) =>
        request<CaretakerAvailabilitySlotDTO>("PUT", replaceUrlParams(CARETAKER_URLS.AVAILABILITY_SLOT, { slotId }), payload),
      removeAvailabilitySlot: (slotId: number) =>
        request<string>("DELETE", replaceUrlParams(CARETAKER_URLS.AVAILABILITY_SLOT, { slotId })),
    }),
    []
  );
};
