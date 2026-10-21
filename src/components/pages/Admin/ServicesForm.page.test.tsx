import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import { useServiceOfferingService } from "../../../services/useServiceOfferingService";
import ServicesFormPage from "./ServicesForm.page";

vi.mock("../../../services/useServiceCategoryService", () => ({
  useServiceCategoryService: vi.fn(),
}));
vi.mock("../../../services/useServiceOfferingService", () => ({
  useServiceOfferingService: vi.fn(),
}));

const mockedUseServiceCategoryService = vi.mocked(useServiceCategoryService);
const mockedUseServiceOfferingService = vi.mocked(useServiceOfferingService);

const existingOffering = {
  id: 7,
  name: "Weekly Temple Visit",
  categoryId: 1,
  categoryName: "Temple Visit",
  description: "desc",
  basePrice: 40,
  durationMinutes: 90,
  status: "INACTIVE" as const,
};

function mockCategoryService() {
  mockedUseServiceCategoryService.mockReturnValue({
    getServiceCategories: vi.fn().mockResolvedValue({
      content: [{ id: 1, name: "Temple Visit", status: "ACTIVE" }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 100,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    }),
    getServiceCategoryById: vi.fn(),
    createServiceCategory: vi.fn(),
    updateServiceCategory: vi.fn(),
    deleteServiceCategory: vi.fn(),
  });
}

function mockOfferingService(overrides: Partial<ReturnType<typeof useServiceOfferingService>> = {}) {
  const service = {
    getServiceOfferings: vi.fn(),
    getServiceOfferingById: vi.fn().mockResolvedValue(existingOffering),
    createServiceOffering: vi.fn().mockResolvedValue({ id: 1, name: "New Service", categoryId: 1, status: "ACTIVE" }),
    updateServiceOffering: vi.fn().mockResolvedValue(existingOffering),
    deleteServiceOffering: vi.fn(),
    ...overrides,
  };
  mockedUseServiceOfferingService.mockReturnValue(service);
  return service;
}

function renderCreatePage() {
  return render(
    <MemoryRouter initialEntries={["/admin/services/new"]}>
      <Routes>
        <Route path="/admin/services/new" element={<ServicesFormPage />} />
        <Route path="/admin/services" element={<div>listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderEditPage(id = "7") {
  return render(
    <MemoryRouter initialEntries={[`/admin/services/${id}`]}>
      <Routes>
        <Route path="/admin/services/:id" element={<ServicesFormPage />} />
        <Route path="/admin/services" element={<div>listing page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ServicesForm.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the offering and navigates to the listing on success", async () => {
    const user = userEvent.setup();
    mockCategoryService();
    const service = mockOfferingService();
    renderCreatePage();

    await user.type(screen.getByLabelText(/Name/), "New Service");
    await user.click(await screen.findByLabelText(/Category/));
    await user.click(await screen.findByRole("option", { name: "Temple Visit" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(service.createServiceOffering).toHaveBeenCalledWith(expect.objectContaining({ name: "New Service", categoryId: 1 }))
    );
    expect(await screen.findByText("listing page")).toBeInTheDocument();
  });

  it("shows the backend's error message and stays on the page when creation fails", async () => {
    const user = userEvent.setup();
    mockCategoryService();
    mockOfferingService({ createServiceOffering: vi.fn().mockRejectedValue({ response: { data: { message: "Category not found" } } }) });
    renderCreatePage();

    await user.type(screen.getByLabelText(/Name/), "X");
    await user.click(await screen.findByLabelText(/Category/));
    await user.click(await screen.findByRole("option", { name: "Temple Visit" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Category not found")).toBeInTheDocument();
    expect(screen.queryByText("listing page")).not.toBeInTheDocument();
  });

  it("loads the existing offering by id and populates the form in edit mode", async () => {
    mockCategoryService();
    mockOfferingService();
    renderEditPage();

    expect(await screen.findByDisplayValue("Weekly Temple Visit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });

  it("submits the update and navigates to the listing on success", async () => {
    const user = userEvent.setup();
    mockCategoryService();
    const service = mockOfferingService();
    renderEditPage();

    await screen.findByDisplayValue("Weekly Temple Visit");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(service.updateServiceOffering).toHaveBeenCalledWith(7, expect.objectContaining({ name: "Weekly Temple Visit" })));
    expect(await screen.findByText("listing page")).toBeInTheDocument();
  });

  it("shows an error if loading the offering fails", async () => {
    mockCategoryService();
    mockOfferingService({ getServiceOfferingById: vi.fn().mockRejectedValue(new Error("not found")) });
    renderEditPage();

    expect(await screen.findByText("not found")).toBeInTheDocument();
  });
});
