import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Checkbox from "./Checkbox";

describe("Checkbox", () => {
  it("renders the label and reflects the checked prop", () => {
    render(<Checkbox label="Accept terms" checked readOnly />);
    expect(screen.getByRole("checkbox", { name: "Accept terms" })).toBeChecked();
  });

  it("calls onChange with the plain boolean checked value, not the raw event", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="Accept terms" checked={false} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders optional helper text below the label", () => {
    render(<Checkbox label="Accept terms" helperText="Required to continue" />);
    expect(screen.getByText("Required to continue")).toBeInTheDocument();
  });

  it("renders no helper text block when none is given", () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.queryByText("Required to continue")).not.toBeInTheDocument();
  });
});
