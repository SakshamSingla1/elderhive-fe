import { useMemo } from "react";
import { request } from ".";

const PRESENCE_URLS = {
  STATUS: "/api/v1/presence/status",
};

/** Mirrors com.elderhive.controllers.PresenceController#getStatus's JSON shape - a plain
 *  userId -> online map, keyed as strings since JSON object keys always are (callers index
 *  it with String(userId), same as ElderSphere's own PresenceStatusResponse). */
export type PresenceStatusResponse = Record<string, boolean>;

// Online/offline is otherwise fed entirely by live /topic/presence events (see
// WebSocketContext) - this REST call exists only for the one thing a WebSocket push can't
// do: an initial snapshot for users a client hasn't seen a connect/disconnect event for yet
// (e.g. a caretaker who's already been online for a while when this page loads).
export const usePresenceService = () => {
  return useMemo(
    () => ({
      // Spring's @RequestParam List<Long> binds a single comma-separated value just as
      // readily as repeated params - joining explicitly here (rather than passing the raw
      // array through axios's own array param serialization) avoids any ambiguity about
      // which wire format axios would actually produce, same precedent ElderSphere's own
      // usePresenceService uses.
      getStatus: (userIds: number[]) =>
        request<PresenceStatusResponse>("GET", PRESENCE_URLS.STATUS, null, {
          params: { userIds: userIds.join(",") },
        }),
    }),
    []
  );
};
