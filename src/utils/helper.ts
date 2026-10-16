import dayjs from "dayjs";

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

// Fills ":param" placeholders in a URL template, e.g. replaceUrlParams("/roles/:id", { id: 5 })
// -> "/roles/5". Keeps service hooks' URL constants readable (named placeholders instead of
// string concatenation at every call site).
export function replaceUrlParams(url: string, params: Record<string, string | number>): string {
  let result = url;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, String(value));
  }
  return result;
}

// Formats a backend LocalDateTime ISO string (e.g. Notification.createdAt) for display —
// first use of dayjs for plain read-only formatting (the existing dependency is otherwise
// only pulled in by @mui/x-date-pickers today).
export function formatDateTime(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const parsed = dayjs(isoString);
  return parsed.isValid() ? parsed.format("MMM D, YYYY h:mm A") : "";
}
