import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders its children and forwards onClick like a plain MUI Button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables itself and shows a spinner when loading", () => {
    render(<Button loading>Save</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("swaps to loadingText while loading, and restores children once not loading", () => {
    const { rerender } = render(
      <Button loading loadingText="Saving…">
        Save
      </Button>
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument();

    rerender(
      <Button loading={false} loadingText="Saving…">
        Save
      </Button>
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("stays disabled when disabled is passed explicitly, independent of loading", () => {
    render(
      <Button disabled loading={false}>
        Save
      </Button>
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("without loadingText, children stay shown even while loading", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
