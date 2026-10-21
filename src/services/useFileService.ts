import { useMemo } from "react";
import { replaceUrlParams } from "../utils/helper";

const FILE_URLS = {
  DOWNLOAD: "/api/v1/files/:id/download",
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/**
 * FileController's GET /api/v1/files/:id/download (Prompt 65) responds with an HTTP 302
 * redirect to the file's actual storage URL, gated by the same httpOnly accessToken cookie
 * every other request relies on — not something services/index.ts's request<T>() (which
 * unwraps a JSON ResponseModel) can meaningfully call. A plain top-level browser navigation
 * (window.open, or an <a href>) sends that cookie along just like any other same-origin
 * request, so building the URL is all this hook needs to do; the caller opens it.
 */
export const useFileService = () => {
  return useMemo(
    () => ({
      getDownloadUrl: (fileAssetId: number) => `${API_BASE_URL}${replaceUrlParams(FILE_URLS.DOWNLOAD, { id: fileAssetId })}`,
    }),
    []
  );
};
