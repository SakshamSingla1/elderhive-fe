// Mirrors com.elderhive.payload.ResponseModel<T> (backend Phase 1, Prompt 5) field-for-field —
// every controller response is wrapped in exactly this envelope.
export interface ApiEnvelope<T> {
  message: string;
  status: "SUCCESS" | "FAILED" | "INTERNAL_SERVER_ERROR";
  data: T;
  errorCode?: string;
}
