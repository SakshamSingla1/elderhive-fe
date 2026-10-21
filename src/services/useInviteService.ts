import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { LinkInviteStatusEnum, UserTypeEnum } from "../utils/enums";

const INVITE_URLS = {
  FOR_PROFILE: "/api/v1/elder-profiles/:elderProfileId/invites",
  ACCEPT: "/api/v1/invites/accept/:token",
  DECLINE: "/api/v1/invites/decline/:token",
};

// Mirrors com.elderhive.dtos.ElderProfileLinkInvite.InviteResponse field-for-field. token
// is included in the API response (see that DTO's own javadoc - there's no real email
// delivery yet) so the inviter can hand it to the invitee directly for now.
export interface InviteResponseDTO {
  id: number;
  elderProfileId: number;
  invitedEmail: string | null;
  invitedPhone: string | null;
  invitedRole: UserTypeEnum;
  relationshipLabel: string | null;
  status: LinkInviteStatusEnum;
  token: string;
  createdAt?: string;
  updatedAt?: string;
}

// Mirrors com.elderhive.dtos.ElderProfileLinkInvite.CreateInviteRequest - exactly one of
// invitedEmail/invitedPhone is required (enforced server-side).
export interface CreateInviteRequestDTO {
  invitedEmail?: string;
  invitedPhone?: string;
  invitedRole: UserTypeEnum;
  relationshipLabel?: string;
}

// There is no "list invites addressed to me" backend endpoint (InviteController, Prompt 63,
// only exposes per-profile listing plus TOKEN-addressed accept/decline — an invitee without
// an account yet only ever has the token from their emailed link, never a browsable inbox).
// Elder/Invites.page.tsx and Family/Invites.page.tsx are built around that real shape:
// the user pastes in the token they received and this service accepts/declines by it.
export const useInviteService = () => {
  return useMemo(
    () => ({
      createInvite: (elderProfileId: number, payload: CreateInviteRequestDTO) =>
        request<InviteResponseDTO>("POST", replaceUrlParams(INVITE_URLS.FOR_PROFILE, { elderProfileId }), payload),
      listForProfile: (elderProfileId: number) =>
        request<InviteResponseDTO[]>("GET", replaceUrlParams(INVITE_URLS.FOR_PROFILE, { elderProfileId })),
      accept: (token: string) => request<InviteResponseDTO>("PUT", replaceUrlParams(INVITE_URLS.ACCEPT, { token })),
      decline: (token: string) => request<InviteResponseDTO>("PUT", replaceUrlParams(INVITE_URLS.DECLINE, { token })),
    }),
    []
  );
};
