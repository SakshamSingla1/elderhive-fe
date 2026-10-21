import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import type { ServiceOfferingResponse } from "../../../services/useServiceOfferingService";
import ServiceOfferingForm from "./ServiceOfferingForm.template";

vi.mock("../../../services/useServiceCategoryService", () => ({
  useServiceCategoryService: vi.fn(),
}));

const mockedUseServiceCategoryService = vi.mocked(useServiceCategoryService);

function mockCategoryService(categories: Array<{ id: number; name: string; status: "ACTIVE" | "INACTIVE" }> = [{ id: 1, name: "Temple Visit", status: "ACTIVE" }]) {
  mockedUseServiceCategoryService.mockReturnValue({
    getServiceCategories: vi.fn().mockResolvedValue({
      content: categories,
      totalElements: categories.length,
      totalPages: 1,
      number: 0,
      size: 100,
      first: true,
      last: true,
      numberOfElements: categories.length,
      empty: categories.length === 0,
    }),
    getServiceCategoryById: vi.fn(),
    createServiceCategory: vi.fn(),
    updateServiceCategory: vi.fn(),
    deleteServiceCategory: vi.fn(),
  });
}

function renderForm(props: Partial<React.ComponentProps<typeof ServiceOfferingForm>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/services/new"]}>
      <Routes>
        <Route
          path="/admin/services/new"
          element={<ServiceOfferingForm mode={props.mode ?? "create"} serviceOffering={props.serviceOffering} onSubmit={props.onSubmit ?? vi.fn()} />}
        />
        <Route path="/admin/services" element={<div>listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ServiceOfferingForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the create title, populates the category select, and submits the entered values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    mockCategoryService();
    renderForm({ onSubmit });

    expect(screen.getByText("Create Service")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Name/), "Weekly Temple Visit");
    await user.click(await screen.findByLabelText(/Category/));
    await user.click(await screen.findByRole("option", { name: "Temple Visit" }));
    await user.type(screen.getByLabelText(/Base Price/), "40");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Weekly Temple Visit", categoryId: 1, basePrice: 40, status: "ACTIVE" })
      )
    );
  });

  it("shows a Yup validation error once the Name field is blurred empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    mockCategoryService();
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

  it("pre-fills the form from the given offering in edit mode", async () => {
    mockCategoryService();
    const serviceOffering: ServiceOfferingResponse = {
      id: 1,
      name: "Weekly Temple Visit",
      categoryId: 1,
      categoryName: "Temple Visit",
      description: "A weekly visit.",
      basePrice: 40,
      durationMinutes: 90,
      status: "ACTIVE",
    };
    renderForm({ mode: "edit", serviceOffering });

    expect(screen.getByText("Edit Service")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Weekly Temple Visit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("40")).toBeInTheDocument();
    expect(screen.getByDisplayValue("90")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });

  it("Cancel navigates back to the listing", async () => {
    const user = userEvent.setup();
    mockCategoryService();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("listing page")).toBeInTheDocument();
  });
});
