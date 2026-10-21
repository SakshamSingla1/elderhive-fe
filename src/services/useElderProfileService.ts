import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { PageResponse } from "../utils/types";
import type { GenderEnum } from "../utils/enums";

const ELDER_PROFILE_URLS = {
  BASE: "/api/v1/elder-profiles",
  ME: "/api/v1/elder-profiles/me",
  BY_ID: "/api/v1/elder-profiles/:id",
  FAMILY_MEMBERS: "/api/v1/elder-profiles/:id/family-members",
  FAMILY_MEMBER: "/api/v1/elder-profiles/:id/family-members/:userId",
};

// Mirrors com.elderhive.dtos.ElderProfile.ElderProfileResponse field-for-field.
export interface ElderProfileResponseDTO {
  id: number;
  familyUserId: number | null;
  elderUserId: number | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: GenderEnum | null;
  medicalConditions: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Mirrors com.elderhive.dtos.ElderProfile.ElderProfileRequest - familyUserId/elderUserId
// are accepted by the backend (ADMIN-only path) but this app's forms never set them; the
// server always derives ownership from the caller for every other role (Prompt 61).
export interface ElderProfileRequestDTO {
  fullName: string;
  dateOfBirth?: string | null;
  gender?: GenderEnum | null;
  medicalConditions?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

// Mirrors com.elderhive.dtos.FamilyElderLink.FamilyMemberSummaryResponse field-for-field.
export interface FamilyMemberSummaryDTO {
  userId: number;
  fullName: string | null;
  relationshipLabel: string | null;
  isOwner: boolean;
}

export const useElderProfileService = () => {
  return useMemo(
    () => ({
      create: (payload: ElderProfileRequestDTO) => request<ElderProfileResponseDTO>("POST", ELDER_PROFILE_URLS.BASE, payload),
      getMyProfile: () => request<ElderProfileResponseDTO>("GET", ELDER_PROFILE_URLS.ME),
      getMine: (page = 0, size = 20) =>
        request<PageResponse<ElderProfileResponseDTO>>("GET", ELDER_PROFILE_URLS.BASE, null, { params: { page, size } }),
      getById: (id: number) => request<ElderProfileResponseDTO>("GET", replaceUrlParams(ELDER_PROFILE_URLS.BY_ID, { id })),
      update: (id: number, payload: ElderProfileRequestDTO) =>
        request<ElderProfileResponseDTO>("PUT", replaceUrlParams(ELDER_PROFILE_URLS.BY_ID, { id }), payload),
      remove: (id: number) => request<string>("DELETE", replaceUrlParams(ELDER_PROFILE_URLS.BY_ID, { id })),
      listFamilyMembers: (id: number) =>
        request<FamilyMemberSummaryDTO[]>("GET", replaceUrlParams(ELDER_PROFILE_URLS.FAMILY_MEMBERS, { id })),
      removeFamilyMember: (id: number, userId: number) =>
        request<string>("DELETE", replaceUrlParams(ELDER_PROFILE_URLS.FAMILY_MEMBER, { id, userId })),
    }),
    []
  );
};
