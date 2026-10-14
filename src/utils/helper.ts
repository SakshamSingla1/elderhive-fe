// Extracts a human-readable message from a failed services/index.ts request<T>() call.
// The backend's GlobalExceptionHandler always sets ResponseModel.message on a failure
// response, so that's checked first; falls back to the raw Error's own message, then to
// the caller-supplied default for anything unrecognizable (a network failure with no
// response at all, for instance).
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
