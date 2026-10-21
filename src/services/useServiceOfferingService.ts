import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";
import type { ServiceOfferingStatusEnum } from "../utils/enums";

const SERVICE_OFFERING_URLS = {
  BASE: "/api/v1/service-offerings",
  BY_ID: "/api/v1/service-offerings/:id",
};

// Mirrors com.elderhive.dtos.ServiceOffering.ServiceOfferingResponse field-for-field —
// categoryName is a read-only denormalization the backend adds purely for browsing
// convenience (Prompt 73), since GET /service-categories/{id} itself stays admin-only.
export interface ServiceOfferingResponse extends AuditableResponse {
  id: number;
  name: string;
  categoryId: number;
  categoryName?: string | null;
  description?: string | null;
  basePrice?: number | null;
  durationMinutes?: number | null;
  status: ServiceOfferingStatusEnum;
}

// Mirrors com.elderhive.dtos.ServiceOffering.ServiceOfferingRequest field-for-field.
export interface ServiceOfferingPayload {
  name: string;
  categoryId: number;
  description?: string;
  basePrice?: number;
  durationMinutes?: number;
  status?: ServiceOfferingStatusEnum;
}

export interface ServiceOfferingFilters {
  categoryId?: number;
  status?: ServiceOfferingStatusEnum;
  page?: number;
  size?: number;
}

// Service-offering catalog CRUD (Prompt 72/73 — see ServiceOfferingController). The list
// and getById GETs are open to any authenticated caller so the family-facing browse view
// (Prompt 74) can read them directly; create/update/delete stay SERVICE_MANAGE-gated on
// the backend, same as the admin-only Services catalog pages.
export const useServiceOfferingService = () => {
  return useMemo(
    () => ({
      getServiceOfferings: (filters: ServiceOfferingFilters = {}) => {
        const { page = 0, size = 50, categoryId, status } = filters;
        return request<PageResponse<ServiceOfferingResponse>>("GET", SERVICE_OFFERING_URLS.BASE, null, {
          params: { page, size, categoryId, status },
        });
      },
      getServiceOfferingById: (id: number) =>
        request<ServiceOfferingResponse>("GET", replaceUrlParams(SERVICE_OFFERING_URLS.BY_ID, { id })),
      createServiceOffering: (payload: ServiceOfferingPayload) =>
        request<ServiceOfferingResponse>("POST", SERVICE_OFFERING_URLS.BASE, payload),
      updateServiceOffering: (id: number, payload: ServiceOfferingPayload) =>
        request<ServiceOfferingResponse>("PUT", replaceUrlParams(SERVICE_OFFERING_URLS.BY_ID, { id }), payload),
      deleteServiceOffering: (id: number) =>
        request<string>("DELETE", replaceUrlParams(SERVICE_OFFERING_URLS.BY_ID, { id })),
    }),
    []
  );
};
