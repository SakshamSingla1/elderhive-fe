import { useMemo } from "react";
import { request } from ".";
import { replaceUrlParams } from "../utils/helper";

const META_CONFIG_URLS = {
  BASE: "/meta-configs",
  BY_CONTEXT: "/meta-configs/:context",
};

// Mirrors com.elderhive.dtos.MetaConfig.MetaConfigResponse field-for-field.
export interface MetaConfigResponse {
  id: number;
  context: string;
  data: string;
  updatedAt?: string;
  updatedBy?: number | null;
}

// Mirrors com.elderhive.dtos.MetaConfig.MetaConfigRequest field-for-field.
export interface MetaConfigPayload {
  data: string;
}

// Reads (list/get) are open to any authenticated user (see MetaConfigController) — only
// upsert/remove require CONFIG_MANAGE, Super-Admin-only in practice per the Phase 3
// seeding. "context" is a path segment, never a request body field.
export const useMetaConfigService = () => {
  return useMemo(
    () => ({
      list: () => request<MetaConfigResponse[]>("GET", META_CONFIG_URLS.BASE),
      get: (context: string) => request<MetaConfigResponse>("GET", replaceUrlParams(META_CONFIG_URLS.BY_CONTEXT, { context })),
      upsert: (context: string, payload: MetaConfigPayload) =>
        request<MetaConfigResponse>("PUT", replaceUrlParams(META_CONFIG_URLS.BY_CONTEXT, { context }), payload),
      remove: (context: string) => request<string>("DELETE", replaceUrlParams(META_CONFIG_URLS.BY_CONTEXT, { context })),
    }),
    []
  );
};
