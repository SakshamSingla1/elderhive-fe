import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title, subtitle, and icon", () => {
    render(<PageHeader icon={<span data-testid="icon" />} title="Users" subtitle="Manage every account" />);

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Manage every account")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders an action and a title adornment when given", () => {
    render(
      <PageHeader
        icon={<span />}
        title="My Profile"
        titleAdornment={<span>Pending</span>}
        action={<button type="button">Add</button>}
      />
    );

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("omits the subtitle and action when not given", () => {
    render(<PageHeader icon={<span />} title="Bookings" />);

    expect(screen.getByText("Bookings")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
