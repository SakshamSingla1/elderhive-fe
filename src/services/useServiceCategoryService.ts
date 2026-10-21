import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";
import type { AuditableResponse, PageResponse } from "../utils/types";
import type { ServiceCategoryStatusEnum } from "../utils/enums";

const SERVICE_CATEGORY_URLS = {
  BASE: "/api/v1/service-categories",
  BY_ID: "/api/v1/service-categories/:id",
};

// Mirrors com.elderhive.dtos.ServiceCategory.ServiceCategoryResponse field-for-field.
export interface ServiceCategoryResponse extends AuditableResponse {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  status: ServiceCategoryStatusEnum;
}

// Mirrors com.elderhive.dtos.ServiceCategory.ServiceCategoryRequest field-for-field.
export interface ServiceCategoryPayload {
  name: string;
  description?: string;
  icon?: string;
  status?: ServiceCategoryStatusEnum;
}

export interface ServiceCategoryFilters {
  status?: ServiceCategoryStatusEnum;
  page?: number;
  size?: number;
}

// Service-category catalog CRUD (Prompt 71/73 — see ServiceCategoryController). The list
// GET is open to any authenticated caller so the family-facing browse view (Prompt 74) can
// populate its category filter dropdown; getById and every mutation stay SERVICE_MANAGE-
// gated on the backend, same as the admin-only ServiceCategories catalog pages.
export const useServiceCategoryService = () => {
  return useMemo(
    () => ({
      getServiceCategories: (filters: ServiceCategoryFilters = {}) => {
        const { page = 0, size = 50, status } = filters;
        return request<PageResponse<ServiceCategoryResponse>>("GET", SERVICE_CATEGORY_URLS.BASE, null, {
          params: { page, size, status },
        });
      },
      getServiceCategoryById: (id: number) =>
        request<ServiceCategoryResponse>("GET", replaceUrlParams(SERVICE_CATEGORY_URLS.BY_ID, { id })),
      createServiceCategory: (payload: ServiceCategoryPayload) =>
        request<ServiceCategoryResponse>("POST", SERVICE_CATEGORY_URLS.BASE, payload),
      updateServiceCategory: (id: number, payload: ServiceCategoryPayload) =>
        request<ServiceCategoryResponse>("PUT", replaceUrlParams(SERVICE_CATEGORY_URLS.BY_ID, { id }), payload),
      deleteServiceCategory: (id: number) =>
        request<string>("DELETE", replaceUrlParams(SERVICE_CATEGORY_URLS.BY_ID, { id })),
    }),
    []
  );
};
