import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ElderProfileSearchAutocomplete from "./ElderProfileSearchAutocomplete";
import { useSearchService } from "../../../services/useSearchService";

vi.mock("../../../services/useSearchService", () => ({
  useSearchService: vi.fn(),
}));

const mockedUseSearchService = vi.mocked(useSearchService);

describe("ElderProfileSearchAutocomplete", () => {
  let searchElderProfiles: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    searchElderProfiles = vi.fn().mockResolvedValue([{ id: 1, name: "Grandma Rose", relationship: "Owner" }]);
    mockedUseSearchService.mockReturnValue({ searchElderProfiles } as unknown as ReturnType<typeof useSearchService>);
  });

  it("does not search until at least 2 characters are typed", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ElderProfileSearchAutocomplete label="Elder Profile" onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Elder Profile"), "r");
    vi.advanceTimersByTime(500);
    expect(searchElderProfiles).not.toHaveBeenCalled();
  });

  it("debounces the search and calls searchElderProfiles with the typed query after ~400ms", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ElderProfileSearchAutocomplete label="Elder Profile" onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Elder Profile"), "rose");
    expect(searchElderProfiles).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    await waitFor(() => expect(searchElderProfiles).toHaveBeenCalledWith({ query: "rose", limit: 10 }));
  });

  it("selecting an option calls onSelect with that result, showing its relationship", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<ElderProfileSearchAutocomplete label="Elder Profile" onSelect={onSelect} />);

    await user.type(screen.getByLabelText("Elder Profile"), "rose");
    vi.advanceTimersByTime(400);

    expect(await screen.findByText("Owner")).toBeInTheDocument();
    await user.click(screen.getByText("Grandma Rose"));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: "Grandma Rose" }));
  });

  it("pre-fills from initialValue without triggering a search", () => {
    render(<ElderProfileSearchAutocomplete label="Elder Profile" onSelect={vi.fn()} initialValue={{ id: 9, name: "Preselected Elder" }} />);

    expect(screen.getByDisplayValue("Preselected Elder")).toBeInTheDocument();
    expect(searchElderProfiles).not.toHaveBeenCalled();
  });
});
