import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import ServiceCategoryForm from "./ServiceCategoryForm.template";

function renderForm(props: Partial<React.ComponentProps<typeof ServiceCategoryForm>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/service-categories/new"]}>
      <Routes>
        <Route
          path="/admin/service-categories/new"
          element={<ServiceCategoryForm mode={props.mode ?? "create"} serviceCategory={props.serviceCategory} onSubmit={props.onSubmit ?? vi.fn()} />}
        />
        <Route path="/admin/service-categories" element={<div>listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ServiceCategoryForm", () => {
  it("renders the create title and submits the entered values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    expect(screen.getByText("Create Service Category")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Name/), "Overnight Care");
    await user.type(screen.getByLabelText(/Description/), "Overnight in-home care.");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Overnight Care", description: "Overnight in-home care.", status: "ACTIVE" }),
        expect.anything()
      )
    );
  });

  it("shows a Yup validation error once the Name field is blurred empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    // Formik's handleSubmit doesn't reliably touch+surface every field's error in this
    // test environment just from a submit click - blurring the field directly is the
    // proven way to trigger per-field validation display (same gotcha documented in
    // ColorThemeForm.template.test.tsx).
    await user.click(screen.getByLabelText(/Name/));
    await user.tab();

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("pre-fills the form from the given category in edit mode", () => {
    const serviceCategory: ServiceCategoryResponse = {
      id: 1,
      name: "Temple Visit",
      description: "Accompanying an elder to a place of worship.",
      icon: "temple",
      status: "INACTIVE",
    };
    renderForm({ mode: "edit", serviceCategory });

    expect(screen.getByText("Edit Service Category")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Temple Visit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Accompanying an elder to a place of worship.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });

  it("Cancel navigates back to the listing", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("listing page")).toBeInTheDocument();
  });
});
