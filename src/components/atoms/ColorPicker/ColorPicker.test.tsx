import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ColorPicker from "./ColorPicker";

function getHexInput(): HTMLInputElement {
  // Two text inputs exist once the popover is open: the read-only trigger field and the
  // editable hex field inside the popover - the editable one is the one under test.
  const inputs = screen.getAllByDisplayValue(/^#/i) as HTMLInputElement[];
  const editable = inputs.find((el) => !el.readOnly);
  if (!editable) throw new Error("editable hex input not found - is the popover open?");
  return editable;
}

describe("ColorPicker", () => {
  it("renders the trigger field showing the current value", () => {
    render(<ColorPicker value="#6366F1" />);
    expect(screen.getByDisplayValue("#6366F1")).toBeInTheDocument();
  });

  it("opening the popover shows the live preview and 8 preset swatches, without calling onChange yet", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="#6366F1" onChange={onChange} />);

    await user.click(screen.getByDisplayValue("#6366F1"));

    expect(screen.getByText("#6366F1")).toBeInTheDocument(); // the preview block
    expect(screen.getByText("Presets")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Select color/ })).toHaveLength(8);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("editing the hex field updates the preview live but never commits until Apply", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="#6366F1" onChange={onChange} />);
    await user.click(screen.getByDisplayValue("#6366F1"));

    const hexInput = getHexInput();
    await user.clear(hexInput);
    await user.type(hexInput, "#10B981");

    expect(screen.getByText("#10B981")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    // The trigger's own value is untouched by the still-open, uncommitted edit.
    expect(screen.getByDisplayValue("#6366F1")).toBeInTheDocument();
  });

  it("an invalid hex shows an error and Apply is a no-op for it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="#6366F1" onChange={onChange} />);
    await user.click(screen.getByDisplayValue("#6366F1"));

    const hexInput = getHexInput();
    await user.clear(hexInput);
    await user.type(hexInput, "#zzz");
    expect(screen.getByText("Invalid HEX")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking a preset swatch stages it, then Apply commits it and closes the popover", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="#6366F1" onChange={onChange} />);
    await user.click(screen.getByDisplayValue("#6366F1"));

    await user.click(screen.getByRole("button", { name: "Select color #111827" }));
    expect(screen.getByText("#111827")).toBeInTheDocument(); // staged in the preview
    expect(onChange).not.toHaveBeenCalled(); // not committed yet

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledWith("#111827");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("Cancel discards the staged color and never calls onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="#6366F1" onChange={onChange} />);
    await user.click(screen.getByDisplayValue("#6366F1"));

    const hexInput = getHexInput();
    await user.clear(hexInput);
    await user.type(hexInput, "#10B981");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("#6366F1")).toBeInTheDocument();
  });

  it("an applied color shows up under Recent the next time the popover opens", async () => {
    const user = userEvent.setup();
    let value = "#6366F1";
    const onChange = vi.fn((next: string) => {
      value = next;
    });
    const { rerender } = render(<ColorPicker value={value} onChange={onChange} />);

    // A custom color, not one of the 8 presets, so its swatch can only ever appear once.
    await user.click(screen.getByDisplayValue(value));
    const hexInput = getHexInput();
    await user.clear(hexInput);
    await user.type(hexInput, "#00AABB");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    rerender(<ColorPicker value={value} onChange={onChange} />);

    await user.click(screen.getByDisplayValue(value));
    expect(screen.getByText("Recent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select color #00AABB" })).toBeInTheDocument();
  });

  it("never grows the Recent row past 6 entries and never duplicates an already-recent color", async () => {
    const user = userEvent.setup();
    let value = "#6366F1";
    const onChange = vi.fn((next: string) => {
      value = next;
    });
    const { rerender } = render(<ColorPicker value={value} onChange={onChange} />);

    const applyColor = async (hex: string) => {
      await user.click(screen.getByDisplayValue(value));
      const hexInput = getHexInput();
      await user.clear(hexInput);
      await user.type(hexInput, hex);
      await user.click(screen.getByRole("button", { name: "Apply" }));
      rerender(<ColorPicker value={value} onChange={onChange} />);
    };

    const colors = ["#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"];
    for (const color of colors) {
      await applyColor(color);
    }
    // Re-apply an already-recent color - must not create a second entry for it.
    await applyColor("#222222");

    await user.click(screen.getByDisplayValue(value));
    const recentSwatches = screen.getAllByRole("button", { name: /^Select color/ });
    // 8 presets + at most 6 recents.
    expect(recentSwatches.length).toBeLessThanOrEqual(8 + 6);
    expect(screen.getAllByRole("button", { name: "Select color #222222" })).toHaveLength(1);
  });
});
