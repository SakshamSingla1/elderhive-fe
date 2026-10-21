import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import { useServiceOfferingService } from "../../../services/useServiceOfferingService";
import ServicesPage from "./Services.page";

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
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/services"]}>
      <ServicesPage />
    </MemoryRouter>
  );
}

describe("Services.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fetched offerings", async () => {
    mockCategoryService();
    mockOfferingService();
    renderPage();

    expect(await screen.findByText("Weekly Temple Visit")).toBeInTheDocument();
  });

  it("shows an error alert when the initial load fails", async () => {
    mockCategoryService();
    mockOfferingService(vi.fn().mockRejectedValue(new Error("network down")));
    renderPage();

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });
});
