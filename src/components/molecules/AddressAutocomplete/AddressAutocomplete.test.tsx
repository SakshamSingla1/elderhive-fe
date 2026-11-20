import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddressAutocomplete from "./AddressAutocomplete";
import { useGeocodingService } from "../../../services/useGeocodingService";

vi.mock("../../../services/useGeocodingService", () => ({
  useGeocodingService: vi.fn(),
}));

const mockedUseGeocodingService = vi.mocked(useGeocodingService);

describe("AddressAutocomplete", () => {
  let search: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    search = vi.fn().mockResolvedValue([{ displayName: "MG Road, Bengaluru, India", latitude: 12.9716, longitude: 77.5946 }]);
    mockedUseGeocodingService.mockReturnValue({ search } as unknown as ReturnType<typeof useGeocodingService>);
  });

  it("does not search until at least 3 characters are typed", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AddressAutocomplete label="Address" onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Address"), "mg");
    vi.advanceTimersByTime(500);
    expect(search).not.toHaveBeenCalled();
  });

  it("debounces the search and calls search with the typed query after ~400ms", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AddressAutocomplete label="Address" onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Address"), "mg road");
    expect(search).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    await waitFor(() => expect(search).toHaveBeenCalledWith("mg road"));
  });

  it("selecting a suggestion calls onSelect with the address and lat/long", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<AddressAutocomplete label="Address" onSelect={onSelect} />);

    await user.type(screen.getByLabelText("Address"), "mg road");
    vi.advanceTimersByTime(400);

    await user.click(await screen.findByText("MG Road, Bengaluru, India"));

    expect(onSelect).toHaveBeenCalledWith({ address: "MG Road, Bengaluru, India", latitude: 12.9716, longitude: 77.5946 });
  });

  it("clearing the selection calls onSelect with null", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<AddressAutocomplete label="Address" onSelect={onSelect} initialValue="Old Saved Address" />);

    await user.clear(screen.getByLabelText("Address"));

    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("pre-fills from initialValue without triggering a search", () => {
    render(<AddressAutocomplete label="Address" onSelect={vi.fn()} initialValue="Old Saved Address" />);

    expect(screen.getByDisplayValue("Old Saved Address")).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
  });
});
