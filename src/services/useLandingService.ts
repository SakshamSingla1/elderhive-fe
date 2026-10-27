import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";

const LANDING_URLS = {
  PAGE: "/api/v1/landing/page",
  CONFIG: "/api/v1/landing/config",
  FEATURES: "/api/v1/landing/features",
  FEATURE_BY_ID: "/api/v1/landing/features/:id",
  FAQS: "/api/v1/landing/faqs",
  FAQ_BY_ID: "/api/v1/landing/faqs/:id",
  TESTIMONIALS: "/api/v1/landing/testimonials",
  TESTIMONIAL_BY_ID: "/api/v1/landing/testimonials/:id",
};

// Mirrors com.elderhive.dtos.Landing.LandingPageConfigResponse field-for-field.
export interface LandingPageConfigResponse {
  id: number;
  heroHeadline?: string | null;
  heroSubheadline?: string | null;
  heroImageUrl?: string | null;
  ctaHeadline?: string | null;
  ctaDescription?: string | null;
  ctaButtonText?: string | null;
}

// Mirrors com.elderhive.dtos.Landing.LandingFeatureResponse field-for-field.
export interface LandingFeatureResponse {
  id: number;
  title: string;
  description?: string | null;
  iconName?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
}

// Mirrors com.elderhive.dtos.Landing.LandingFaqResponse field-for-field.
export interface LandingFaqResponse {
  id: number;
  question: string;
  answer: string;
  sortOrder?: number | null;
  isActive: boolean;
}

// Mirrors com.elderhive.dtos.Landing.LandingTestimonialResponse field-for-field.
export interface LandingTestimonialResponse {
  id: number;
  authorName: string;
  authorRole?: string | null;
  content: string;
  avatarUrl?: string | null;
  rating?: number | null;
  sortOrder?: number | null;
  isActive: boolean;
}

// Mirrors com.elderhive.dtos.Landing.LandingPageResponse field-for-field.
export interface LandingPageResponse {
  config: LandingPageConfigResponse | null;
  features: LandingFeatureResponse[];
  faqs: LandingFaqResponse[];
  testimonials: LandingTestimonialResponse[];
}

export type LandingPageConfigPayload = Omit<LandingPageConfigResponse, "id">;
export type LandingFeaturePayload = Omit<LandingFeatureResponse, "id">;
export type LandingFaqPayload = Omit<LandingFaqResponse, "id">;
export type LandingTestimonialPayload = Omit<LandingTestimonialResponse, "id">;

// GET /page is public (no JWT needed - see SecurityConfig); every other call here is
// LANDING_MANAGE-gated server-side, same single-combined-permission shape as
// useRoleService/usePermissionService.
export const useLandingService = () => {
  return useMemo(
    () => ({
      getPublicPage: () => request<LandingPageResponse>("GET", LANDING_URLS.PAGE),
      updateConfig: (payload: LandingPageConfigPayload) =>
        request<LandingPageConfigResponse>("PUT", LANDING_URLS.CONFIG, payload),

      getAllFeatures: () => request<LandingFeatureResponse[]>("GET", LANDING_URLS.FEATURES),
      createFeature: (payload: LandingFeaturePayload) => request<LandingFeatureResponse>("POST", LANDING_URLS.FEATURES, payload),
      updateFeature: (id: number, payload: LandingFeaturePayload) =>
        request<LandingFeatureResponse>("PUT", replaceUrlParams(LANDING_URLS.FEATURE_BY_ID, { id }), payload),
      deleteFeature: (id: number) => request<string>("DELETE", replaceUrlParams(LANDING_URLS.FEATURE_BY_ID, { id })),

      getAllFaqs: () => request<LandingFaqResponse[]>("GET", LANDING_URLS.FAQS),
      createFaq: (payload: LandingFaqPayload) => request<LandingFaqResponse>("POST", LANDING_URLS.FAQS, payload),
      updateFaq: (id: number, payload: LandingFaqPayload) =>
        request<LandingFaqResponse>("PUT", replaceUrlParams(LANDING_URLS.FAQ_BY_ID, { id }), payload),
      deleteFaq: (id: number) => request<string>("DELETE", replaceUrlParams(LANDING_URLS.FAQ_BY_ID, { id })),

      getAllTestimonials: () => request<LandingTestimonialResponse[]>("GET", LANDING_URLS.TESTIMONIALS),
      createTestimonial: (payload: LandingTestimonialPayload) =>
        request<LandingTestimonialResponse>("POST", LANDING_URLS.TESTIMONIALS, payload),
      updateTestimonial: (id: number, payload: LandingTestimonialPayload) =>
        request<LandingTestimonialResponse>("PUT", replaceUrlParams(LANDING_URLS.TESTIMONIAL_BY_ID, { id }), payload),
      deleteTestimonial: (id: number) => request<string>("DELETE", replaceUrlParams(LANDING_URLS.TESTIMONIAL_BY_ID, { id })),
    }),
    []
  );
};
