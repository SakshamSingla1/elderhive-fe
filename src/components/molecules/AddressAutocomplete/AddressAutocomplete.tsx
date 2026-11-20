import React, { useMemo, useState } from "react";
import { Autocomplete, CircularProgress } from "@mui/material";
import TextField from "../../atoms/TextField/TextField";
import { useGeocodingService, type GeocodingResultDTO } from "../../../services/useGeocodingService";
import { useDebounce, getErrorMessage } from "../../../utils/helper";

// Higher than the 2-character minimum ElderProfileSearchAutocomplete/
// CaretakerSearchAutocomplete use for name search - a 1-2 letter address fragment matches
// too broadly against Nominatim/Mapbox and just burns API calls for no useful suggestions.
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 400;

export interface AddressAutocompleteSelection {
  address: string;
  latitude: number;
  longitude: number;
}

export interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  onSelect: (selection: AddressAutocompleteSelection | null) => void;
  helperText?: React.ReactNode;
  disabled?: boolean;
  /** Pre-fills the field's displayed text (e.g. a previously-saved address string) without
   *  triggering a search - see ElderProfileSearchAutocomplete's identical prop for why
   *  this is safe (only ever used for display via getOptionLabel, never added to
   *  `options`, and never passed to onSelect unless the user re-picks a real suggestion). */
  initialValue?: string | null;
}

/**
 * Debounced address search backed by GET /api/v1/geocoding/search (Prompt 103/104) -
 * resolves to Mapbox or the free Nominatim fallback server-side, this component never
 * knows or cares which. On selection, fills both a human-readable address and its lat/long
 * into the parent form via onSelect; the parent decides what to do with each piece (e.g.
 * CaretakerProfile's form has no address column, so it only uses latitude/longitude).
 */
const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ label, placeholder, onSelect, helperText, disabled, initialValue }) => {
  const geocodingService = useGeocodingService();
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<GeocodingResultDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GeocodingResultDTO | null>(
    initialValue ? ({ displayName: initialValue, latitude: null, longitude: null } as GeocodingResultDTO) : null
  );

  const runSearch = useDebounce(async (query: string) => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setOptions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await geocodingService.search(query.trim());
      setOptions(results);
    } catch (err) {
      setError(getErrorMessage(err, "Address search failed"));
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, DEBOUNCE_MS);

  const noOptionsText = useMemo(() => {
    if (error) return error;
    if (inputValue.trim().length < MIN_QUERY_LENGTH) return "Type at least 3 characters to search";
    return "No matching addresses found";
  }, [error, inputValue]);

  return (
    <Autocomplete<GeocodingResultDTO>
      options={options}
      loading={loading}
      value={selected}
      disabled={disabled}
      filterOptions={(x) => x}
      getOptionLabel={(option) => option.displayName ?? ""}
      isOptionEqualToValue={(option, value) =>
        option.displayName === value.displayName && option.latitude === value.latitude && option.longitude === value.longitude
      }
      noOptionsText={noOptionsText}
      onInputChange={(_e, value) => {
        setInputValue(value);
        runSearch(value);
      }}
      onChange={(_e, value) => {
        setSelected(value);
        if (value && value.displayName != null && value.latitude != null && value.longitude != null) {
          onSelect({ address: value.displayName, latitude: value.latitude, longitude: value.longitude });
        } else {
          onSelect(null);
        }
      }}
      renderOption={(props, option) => (
        <li {...props} key={`${option.displayName}-${option.latitude}-${option.longitude}`}>
          {option.displayName}
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

export default AddressAutocomplete;
