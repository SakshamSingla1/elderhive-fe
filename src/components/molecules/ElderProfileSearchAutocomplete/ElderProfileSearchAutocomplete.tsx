import React, { useMemo, useState } from "react";
import { Autocomplete, CircularProgress, Stack, Typography } from "@mui/material";
import TextField from "../../atoms/TextField/TextField";
import { useSearchService, type ElderProfileSearchResultDTO } from "../../../services/useSearchService";
import { useDebounce, getErrorMessage } from "../../../utils/helper";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

export interface ElderProfileSearchAutocompleteProps {
  label: string;
  placeholder?: string;
  onSelect: (profile: ElderProfileSearchResultDTO | null) => void;
  helperText?: React.ReactNode;
  disabled?: boolean;
  /** Pre-fills the field without triggering a search - see CaretakerSearchAutocomplete's
   *  identical prop for why this is safe (only `id`/`name` populated, never added to
   *  `options`, and renderOption/getOptionLabel only ever read those two fields). */
  initialValue?: { id: number; name: string } | null;
}

/**
 * Debounced name-search picker backed by GET /api/v1/search/elder-profiles (Prompt 68) -
 * unlike ElderSphere's own reference (an admin-facing global search by name), ElderHive's
 * endpoint is scoped SERVER-SIDE to elder profiles the authenticated caller can actually
 * access (owner, co-manager, or the elder themselves) - there is no global elder search.
 * Each result's `relationship` field (e.g. "Owner", "Elder", a FamilyElderLink label) is
 * shown alongside the name instead of date of birth, since that's what this endpoint
 * actually returns.
 */
const ElderProfileSearchAutocomplete: React.FC<ElderProfileSearchAutocompleteProps> = ({
  label,
  placeholder,
  onSelect,
  helperText,
  disabled,
  initialValue,
}) => {
  const searchService = useSearchService();
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<ElderProfileSearchResultDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ElderProfileSearchResultDTO | null>(
    initialValue ? ({ id: initialValue.id, name: initialValue.name } as ElderProfileSearchResultDTO) : null
  );

  const runSearch = useDebounce(async (query: string) => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setOptions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await searchService.searchElderProfiles({ query: query.trim(), limit: 10 });
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
    return "No matching elder profiles found";
  }, [error, inputValue]);

  return (
    <Autocomplete<ElderProfileSearchResultDTO>
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
          <Stack>
            <Typography variant="body2" fontWeight={600}>
              {option.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {option.relationship ?? `Profile #${option.id}`}
            </Typography>
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

export default ElderProfileSearchAutocomplete;
