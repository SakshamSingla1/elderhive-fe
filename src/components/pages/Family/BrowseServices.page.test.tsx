import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import { useServiceOfferingService } from "../../../services/useServiceOfferingService";
import BrowseServicesPage from "./BrowseServices.page";

vi.mock("../../../services/useServiceCategoryService", () => ({
  useServiceCategoryService: vi.fn(),
}));
vi.mock("../../../services/useServiceOfferingService", () => ({
  useServiceOfferingService: vi.fn(),
}));

const mockedUseServiceCategoryService = vi.mocked(useServiceCategoryService);
const mockedUseServiceOfferingService = vi.mocked(useServiceOfferingService);

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

function mockOfferingService(
  getServiceOfferings = vi.fn().mockResolvedValue({
    content: [{ id: 1, name: "Weekly Temple Visit", categoryId: 1, categoryName: "Temple Visit", status: "ACTIVE" }],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 9,
    first: true,
    last: true,
    numberOfElements: 1,
    empty: false,
  })
) {
  mockedUseServiceOfferingService.mockReturnValue({
    getServiceOfferings,
    getServiceOfferingById: vi.fn(),
    createServiceOffering: vi.fn(),
    updateServiceOffering: vi.fn(),
    deleteServiceOffering: vi.fn(),
  });
  return getServiceOfferings;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/family/services"]}>
      <BrowseServicesPage />
    </MemoryRouter>
  );
}

describe("BrowseServices.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fetched offerings read-only, with no mutation buttons", async () => {
    mockCategoryService();
    mockOfferingService();
    renderPage();

    expect(await screen.findByText("Weekly Temple Visit")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Service" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete")).not.toBeInTheDocument();
  });

  it("always fetches with status=ACTIVE, regardless of category filter", async () => {
    mockCategoryService();
    const getServiceOfferings = mockOfferingService();
    renderPage();

    await waitFor(() => expect(getServiceOfferings).toHaveBeenCalledWith(expect.objectContaining({ status: "ACTIVE" })));
  });

  it("shows an error alert when the initial load fails", async () => {
    mockCategoryService();
    mockOfferingService(vi.fn().mockRejectedValue(new Error("network down")));
    renderPage();

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });
});
