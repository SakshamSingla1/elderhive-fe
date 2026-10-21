import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import ServiceCategoriesFormPage from "./ServiceCategoriesForm.page";

vi.mock("../../../services/useServiceCategoryService", () => ({
  useServiceCategoryService: vi.fn(),
}));

const mockedUseServiceCategoryService = vi.mocked(useServiceCategoryService);

const existingCategory = { id: 7, name: "Temple Visit", description: "desc", icon: "temple", status: "INACTIVE" as const };

function mockService(overrides: Partial<ReturnType<typeof useServiceCategoryService>> = {}) {
  const service = {
    getServiceCategories: vi.fn(),
    getServiceCategoryById: vi.fn().mockResolvedValue(existingCategory),
    createServiceCategory: vi.fn().mockResolvedValue({ id: 1, name: "New Category", status: "ACTIVE" }),
    updateServiceCategory: vi.fn().mockResolvedValue(existingCategory),
    deleteServiceCategory: vi.fn(),
    ...overrides,
  };
  mockedUseServiceCategoryService.mockReturnValue(service);
  return service;
}

function renderCreatePage() {
  return render(
    <MemoryRouter initialEntries={["/admin/service-categories/new"]}>
      <Routes>
        <Route path="/admin/service-categories/new" element={<ServiceCategoriesFormPage />} />
        <Route path="/admin/service-categories" element={<div>listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderEditPage(id = "7") {
  return render(
    <MemoryRouter initialEntries={[`/admin/service-categories/${id}`]}>
      <Routes>
        <Route path="/admin/service-categories/:id" element={<ServiceCategoriesFormPage />} />
        <Route path="/admin/service-categories" element={<div>listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ServiceCategoriesForm.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the category and navigates to the listing on success", async () => {
    const user = userEvent.setup();
    const service = mockService();
    renderCreatePage();

    await user.type(screen.getByLabelText(/Name/), "New Category");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(service.createServiceCategory).toHaveBeenCalledWith(expect.objectContaining({ name: "New Category" })));
    expect(await screen.findByText("listing page")).toBeInTheDocument();
  });

  it("shows the backend's error message and stays on the page when creation fails", async () => {
    const user = userEvent.setup();
    mockService({ createServiceCategory: vi.fn().mockRejectedValue({ response: { data: { message: "Category already exists" } } }) });
    renderCreatePage();

    await user.type(screen.getByLabelText(/Name/), "Duplicate");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Category already exists")).toBeInTheDocument();
    expect(screen.queryByText("listing page")).not.toBeInTheDocument();
  });

  it("loads the existing category by id and populates the form in edit mode", async () => {
    mockService();
    renderEditPage();

    expect(await screen.findByDisplayValue("Temple Visit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });

  it("submits the update and navigates to the listing on success", async () => {
    const user = userEvent.setup();
    const service = mockService();
    renderEditPage();

    await screen.findByDisplayValue("Temple Visit");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(service.updateServiceCategory).toHaveBeenCalledWith(7, expect.objectContaining({ name: "Temple Visit" })));
    expect(await screen.findByText("listing page")).toBeInTheDocument();
  });

  it("shows an error if loading the category fails", async () => {
    mockService({ getServiceCategoryById: vi.fn().mockRejectedValue(new Error("not found")) });
    renderEditPage();

    expect(await screen.findByText("not found")).toBeInTheDocument();
  });
});
