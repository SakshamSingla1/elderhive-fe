// Mirrors com.elderhive.payload.ResponseModel<T> (backend Phase 1, Prompt 5) field-for-field —
// every controller response is wrapped in exactly this envelope.
export interface ApiEnvelope<T> {
  message: string;
  status: "SUCCESS" | "FAILED" | "INTERNAL_SERVER_ERROR";
  data: T;
  errorCode?: string;
}

// Mirrors Spring's org.springframework.data.domain.Page<T> JSON shape — returned by the
// backend's paginated list endpoints (e.g. GET /roles, GET /nav-links).
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page, 0-based
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// Mirrors the createdAt/updatedAt pair every com.elderhive.audit.Auditable entity's
// response DTO carries.
export interface AuditableResponse {
  createdAt?: string;
  updatedAt?: string;
}
