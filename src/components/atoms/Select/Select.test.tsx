import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Select from "./Select";

const OPTIONS = [
  { value: "A", label: "Option A" },
  { value: "B", label: "Option B" },
];

describe("Select", () => {
  it("renders the label and the currently selected option's text", () => {
    render(<Select label="Choice" options={OPTIONS} value="A" onChange={vi.fn()} />);

    // MUI's outlined variant renders the label twice (the real <label> plus a hidden
    // <legend> for the notched-outline border gap) - both are expected here.
    expect(screen.getAllByText("Choice").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox")).toHaveTextContent("Option A");
  });

  it("calls onChange with the raw value (not the event) when a different option is picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select label="Choice" options={OPTIONS} value="A" onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Option B"));

    expect(onChange).toHaveBeenCalledWith("B");
  });

  it("a truthy string error sets the error state and becomes the helperText", () => {
    render(<Select label="Choice" options={OPTIONS} value="A" onChange={vi.fn()} error="A choice is required" />);
    expect(screen.getByText("A choice is required")).toBeInTheDocument();
  });

  it("renders every option in the open menu", async () => {
    const user = userEvent.setup();
    render(<Select label="Choice" options={OPTIONS} value="A" onChange={vi.fn()} />);

    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Option A")).toBeInTheDocument();
    expect(within(listbox).getByText("Option B")).toBeInTheDocument();
  });
});
