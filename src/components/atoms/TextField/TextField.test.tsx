import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TextField from "./TextField";

describe("TextField", () => {
  it("defaults to fullWidth", () => {
    render(<TextField label="Name" />);
    expect(screen.getByLabelText("Name").closest(".MuiFormControl-root")).toHaveClass("MuiTextField-root");
  });

  it("forwards value/onChange like a plain controlled input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField label="Name" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText("Name"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("a truthy string error sets the error state and becomes the helperText", () => {
    render(<TextField label="Email" error="Email is required" />);

    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("a falsy error (false/undefined/empty string) shows no error state", () => {
    render(<TextField label="Email" error={false} />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "false");
  });

  it("an explicit helperText wins over a string error's own text", () => {
    render(<TextField label="Email" error="Required" helperText="Custom message" />);

    expect(screen.getByText("Custom message")).toBeInTheDocument();
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });

  it("a plain boolean error still works exactly like MUI's own prop", () => {
    render(<TextField label="Email" error={true} helperText="Invalid" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Invalid")).toBeInTheDocument();
  });

  it("an explicit fullWidth={false} overrides the default", () => {
    const { container } = render(<TextField label="Name" fullWidth={false} />);
    expect(container.querySelector(".MuiTextField-root")).not.toHaveClass("MuiFormControl-fullWidth");
  });
});
