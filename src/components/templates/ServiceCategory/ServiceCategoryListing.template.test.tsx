import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import type { ServiceCategoryResponse } from "../../../services/useServiceCategoryService";
import ServiceCategoryListingTemplate from "./ServiceCategoryListing.template";

vi.mock("../../../services/useServiceCategoryService", () => ({
  useServiceCategoryService: vi.fn(),
}));

const mockedUseServiceCategoryService = vi.mocked(useServiceCategoryService);

function category(id: number, name: string, status: "ACTIVE" | "INACTIVE" = "ACTIVE"): ServiceCategoryResponse {
  return { id, name, status };
}

function mockService(deleteServiceCategory = vi.fn()) {
  mockedUseServiceCategoryService.mockReturnValue({
    getServiceCategories: vi.fn(),
    getServiceCategoryById: vi.fn(),
    createServiceCategory: vi.fn(),
    updateServiceCategory: vi.fn(),
    deleteServiceCategory,
  });
}

function renderListing(props: Partial<React.ComponentProps<typeof ServiceCategoryListingTemplate>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/service-categories"]}>
      <Routes>
        <Route
          path="/admin/service-categories"
          element={
            <ServiceCategoryListingTemplate
              serviceCategories={props.serviceCategories ?? [category(1, "Temple Visit"), category(2, "Hospital Visit")]}
              page={props.page ?? 0}
              totalPages={props.totalPages ?? 1}
              onPageChange={props.onPageChange ?? vi.fn()}
              onRefresh={props.onRefresh}
              isLoading={props.isLoading ?? false}
            />
          }
        />
        <Route path="/admin/service-categories/new" element={<div>add category page</div>} />
        <Route path="/admin/service-categories/:id" element={<div>edit category page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ServiceCategoryListingTemplate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a card per category", () => {
    mockService();
    renderListing();

    expect(screen.getByText("Temple Visit")).toBeInTheDocument();
    expect(screen.getByText("Hospital Visit")).toBeInTheDocument();
  });

  it("shows a skeleton grid while loading, not the categories or the empty state", () => {
    mockService();
    renderListing({ isLoading: true, serviceCategories: [] });

    expect(screen.queryByText("Temple Visit")).not.toBeInTheDocument();
    expect(screen.queryByText("No service categories found")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no categories and not loading", () => {
    mockService();
    renderListing({ serviceCategories: [] });

    expect(screen.getByText("No service categories found")).toBeInTheDocument();
  });

  it("navigates to the add page when Add Category is clicked", async () => {
    const user = userEvent.setup();
    mockService();
    renderListing();

    await user.click(screen.getByRole("button", { name: "Add Category" }));
    expect(await screen.findByText("add category page")).toBeInTheDocument();
  });

  it("navigates to the edit page when Edit is clicked", async () => {
    const user = userEvent.setup();
    mockService();
    renderListing();

    await user.click(screen.getAllByLabelText("Edit")[0]);
    expect(await screen.findByText("edit category page")).toBeInTheDocument();
  });

  it("shows pagination only when there's more than one page, and calls onPageChange with a 0-based page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    mockService();
    renderListing({ page: 0, totalPages: 3, onPageChange });

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("deleting a category shows a confirmation dialog, calls deleteServiceCategory, and refreshes on success", async () => {
    const user = userEvent.setup();
    const deleteServiceCategory = vi.fn().mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    mockService(deleteServiceCategory);
    renderListing({ onRefresh });

    const deleteButtons = screen.getAllByLabelText("Delete");
    await user.click(deleteButtons[0]);

    expect(screen.getByText("Delete this category?")).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteServiceCategory).toHaveBeenCalledWith(1));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Category deleted")).toBeInTheDocument();
  });

  it("Cancel in the confirmation dialog never calls deleteServiceCategory", async () => {
    const user = userEvent.setup();
    const deleteServiceCategory = vi.fn();
    mockService(deleteServiceCategory);
    renderListing();

    await user.click(screen.getAllByLabelText("Delete")[0]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Delete this category?")).not.toBeInTheDocument());
    expect(deleteServiceCategory).not.toHaveBeenCalled();
  });

  it("shows an error message if deletion fails", async () => {
    const user = userEvent.setup();
    mockService(vi.fn().mockRejectedValue(new Error("boom")));
    renderListing();

    await user.click(screen.getAllByLabelText("Delete")[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
