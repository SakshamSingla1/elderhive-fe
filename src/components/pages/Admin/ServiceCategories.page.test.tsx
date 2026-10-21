import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import ServiceCategoriesPage from "./ServiceCategories.page";

vi.mock("../../../services/useServiceCategoryService", () => ({
  useServiceCategoryService: vi.fn(),
}));

const mockedUseServiceCategoryService = vi.mocked(useServiceCategoryService);

function mockService(
  getServiceCategories = vi.fn().mockResolvedValue({
    content: [{ id: 1, name: "Temple Visit", status: "ACTIVE" }],
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
  mockedUseServiceCategoryService.mockReturnValue({
    getServiceCategories,
    getServiceCategoryById: vi.fn(),
    createServiceCategory: vi.fn(),
    updateServiceCategory: vi.fn(),
    deleteServiceCategory: vi.fn(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/service-categories"]}>
      <ServiceCategoriesPage />
    </MemoryRouter>
  );
}

describe("ServiceCategories.page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fetched categories", async () => {
    mockService();
    renderPage();

    expect(await screen.findByText("Temple Visit")).toBeInTheDocument();
  });

  it("shows an error alert when the initial load fails", async () => {
    mockService(vi.fn().mockRejectedValue(new Error("network down")));
    renderPage();

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });
});
