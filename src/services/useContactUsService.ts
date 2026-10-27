import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { PageResponse } from "../utils/types";
import type { ContactUsStatusEnum } from "../utils/enums";

const CONTACT_US_URLS = {
  BASE: "/api/v1/contact-us",
  STATUS: "/api/v1/contact-us/:id/status",
  BY_ID: "/api/v1/contact-us/:id",
};

// Mirrors com.elderhive.dtos.ContactUs.ContactUsResponse field-for-field.
export interface ContactUsResponse {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  status: ContactUsStatusEnum;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactUsPayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface ContactUsFilter {
  page?: number;
  size?: number;
  search?: string;
  status?: ContactUsStatusEnum;
}

// `submit` is public (no JWT needed - see SecurityConfig); every other call here is
// CONTACT_US_MANAGE-gated server-side.
export const useContactUsService = () => {
  return useMemo(
    () => ({
      submit: (payload: ContactUsPayload) => request<ContactUsResponse>("POST", CONTACT_US_URLS.BASE, payload),
      search: ({ page = 0, size = 20, search, status }: ContactUsFilter = {}) =>
        request<PageResponse<ContactUsResponse>>("GET", CONTACT_US_URLS.BASE, null, { params: { page, size, search, status } }),
      updateStatus: (id: number, status: ContactUsStatusEnum) =>
        request<ContactUsResponse>("PUT", replaceUrlParams(CONTACT_US_URLS.STATUS, { id }), null, { params: { status } }),
      remove: (id: number) => request<string>("DELETE", replaceUrlParams(CONTACT_US_URLS.BY_ID, { id })),
    }),
    []
  );
};
