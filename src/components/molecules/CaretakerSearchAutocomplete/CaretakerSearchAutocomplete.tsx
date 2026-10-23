import React, { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import TextField from "../../atoms/TextField/TextField";
import { useSearchService, type CaretakerSearchResultDTO } from "../../../services/useSearchService";
import { usePresenceService } from "../../../services/usePresenceService";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useDebounce, getErrorMessage } from "../../../utils/helper";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

export interface CaretakerSearchAutocompleteProps {
  label: string;
  placeholder?: string;
  onSelect: (caretaker: CaretakerSearchResultDTO | null) => void;
  helperText?: React.ReactNode;
  disabled?: boolean;
  /** Pre-fills the field as "already selected X" (e.g. editing something with an existing
   *  reference) without triggering a search — only `id`/`name` are populated, which is
   *  safe because getOptionLabel only ever reads `.name`, and this placeholder object is
   *  never added to `options`, so renderOption (which reads the other fields) never sees it. */
  initialValue?: { id: number; name: string } | null;
}

/**
 * Debounced name-search picker backed by GET /api/v1/search/caretakers (Prompt 68) - a
 * lightweight CaretakerSearchResultDTO (id/name/specialtiesSummary/ratingAverage/
 * verificationStatus), not the full CaretakerProfileResponseDTO. Mirrors ElderSphere's own
 * CaretakerSearchAutocomplete's debounced-Autocomplete shape, adapted to this prompt's
 * different, lighter search DTO (no serviceArea/bio fields to show).
 */
const CaretakerSearchAutocomplete: React.FC<CaretakerSearchAutocompleteProps> = ({
  label,
  placeholder,
  onSelect,
  helperText,
  disabled,
  initialValue,
}) => {
  const searchService = useSearchService();
  const presenceService = usePresenceService();
  const { subscribe } = useWebSocket();
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<CaretakerSearchResultDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<CaretakerSearchResultDTO | null>(
    initialValue ? ({ id: initialValue.id, name: initialValue.name } as CaretakerSearchResultDTO) : null
  );

  // A snapshot for whichever results are currently showing (so the dot in each
  // renderOption row has something to show immediately, not just once a live
  // /topic/presence event happens to arrive for that particular user).
  const optionUserIdsKey = options.map((o) => o.userId).join(",");
  useEffect(() => {
    if (options.length === 0) return;
    const ids = Array.from(new Set(options.map((o) => o.userId)));
    presenceService
      .getStatus(ids)
      .then((status) => {
        setPresence((prev) => {
          const next = { ...prev };
          Object.entries(status).forEach(([id, online]) => {
            next[Number(id)] = online;
          });
          return next;
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionUserIdsKey]);

  useEffect(() => {
    return subscribe("/topic/presence", (frame) => {
      try {
        const payload: { userId: number; online: boolean } = JSON.parse(frame.body);
        setPresence((prev) => ({ ...prev, [payload.userId]: payload.online }));
      } catch {
        // ignore malformed presence frames
      }
    });
  }, [subscribe]);

  const runSearch = useDebounce(async (query: string) => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setOptions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await searchService.searchCaretakers({ query: query.trim(), limit: 10 });
      setOptions(results);
    } catch (err) {
      setError(getErrorMessage(err, "Search failed"));
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, DEBOUNCE_MS);

  const noOptionsText = useMemo(() => {
    if (error) return error;
    if (inputValue.trim().length < MIN_QUERY_LENGTH) return "Type at least 2 characters to search";
    return "No matching caretakers found";
  }, [error, inputValue]);

  return (
    <Autocomplete<CaretakerSearchResultDTO>
      options={options}
      loading={loading}
      value={selected}
      disabled={disabled}
      filterOptions={(x) => x}
      getOptionLabel={(option) => option.name ?? ""}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={noOptionsText}
      onInputChange={(_e, value) => {
        setInputValue(value);
        runSearch(value);
      }}
      onChange={(_e, value) => {
        setSelected(value);
        onSelect(value);
      }}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Stack direction="row" spacing={1} alignItems="center" width="100%" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  bgcolor: presence[option.userId] ? "success.main" : "grey.400",
                }}
                aria-label={presence[option.userId] ? "Online" : "Offline"}
              />
              <Stack>
                <Typography variant="body2" fontWeight={600}>
                  {option.name}
                </Typography>
                {option.specialtiesSummary && (
                  <Typography variant="caption" color="text.secondary">
                    {option.specialtiesSummary}
                  </Typography>
                )}
              </Stack>
            </Stack>
            <Chip label={option.verificationStatus} size="small" />
          </Stack>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
};

export default CaretakerSearchAutocomplete;
