import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useServiceCategoryService } from "../../../services/useServiceCategoryService";
import { useServiceOfferingService } from "../../../services/useServiceOfferingService";
import type { ServiceOfferingResponse } from "../../../services/useServiceOfferingService";
import ServiceOfferingListingTemplate from "./ServiceOfferingListing.template";

vi.mock("../../../services/useServiceCategoryService", () => ({
  useServiceCategoryService: vi.fn(),
}));
vi.mock("../../../services/useServiceOfferingService", () => ({
  useServiceOfferingService: vi.fn(),
}));

const mockedUseServiceCategoryService = vi.mocked(useServiceCategoryService);
const mockedUseServiceOfferingService = vi.mocked(useServiceOfferingService);

function offering(id: number, name: string, categoryName = "Temple Visit"): ServiceOfferingResponse {
  return { id, name, categoryId: 1, categoryName, status: "ACTIVE" };
}

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

function mockOfferingService(deleteServiceOffering = vi.fn()) {
  mockedUseServiceOfferingService.mockReturnValue({
    getServiceOfferings: vi.fn(),
    getServiceOfferingById: vi.fn(),
    createServiceOffering: vi.fn(),
    updateServiceOffering: vi.fn(),
    deleteServiceOffering,
  });
}

function renderListing(props: Partial<React.ComponentProps<typeof ServiceOfferingListingTemplate>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/services"]}>
      <Routes>
        <Route
          path="/admin/services"
          element={
            <ServiceOfferingListingTemplate
              serviceOfferings={props.serviceOfferings ?? [offering(1, "Weekly Temple Visit"), offering(2, "Hospital Companion")]}
              page={props.page ?? 0}
              totalPages={props.totalPages ?? 1}
              onPageChange={props.onPageChange ?? vi.fn()}
              categoryId={props.categoryId ?? null}
              onCategoryChange={props.onCategoryChange ?? vi.fn()}
              onRefresh={props.onRefresh}
              isLoading={props.isLoading ?? false}
              allowMutations={props.allowMutations}
            />
          }
        />
        <Route path="/admin/services/new" element={<div>add service page</div>} />
        <Route path="/admin/services/:id" element={<div>edit service page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ServiceOfferingListingTemplate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a card per offering, including its denormalized category name", () => {
    mockCategoryService();
    mockOfferingService();
    renderListing();

    expect(screen.getByText("Weekly Temple Visit")).toBeInTheDocument();
    expect(screen.getByText("Hospital Companion")).toBeInTheDocument();
    expect(screen.getAllByText("Temple Visit").length).toBeGreaterThan(0);
  });

  it("populates the category filter dropdown from useServiceCategoryService", async () => {
    mockCategoryService([
      { id: 1, name: "Temple Visit", status: "ACTIVE" },
      { id: 2, name: "Hospital Visit", status: "ACTIVE" },
    ]);
    mockOfferingService();
    const user = userEvent.setup();
    renderListing();

    await user.click(screen.getByLabelText("Category"));
    expect(await screen.findByRole("option", { name: "Hospital Visit" })).toBeInTheDocument();
  });

  it("calls onCategoryChange with the selected category id", async () => {
    mockCategoryService([{ id: 2, name: "Hospital Visit", status: "ACTIVE" }]);
    mockOfferingService();
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    renderListing({ onCategoryChange });

    await user.click(screen.getByLabelText("Category"));
    await user.click(await screen.findByRole("option", { name: "Hospital Visit" }));

    expect(onCategoryChange).toHaveBeenCalledWith(2);
  });

  it("shows the empty state when there are no offerings and not loading", () => {
    mockCategoryService();
    mockOfferingService();
    renderListing({ serviceOfferings: [] });

    expect(screen.getByText("No service offerings found")).toBeInTheDocument();
  });

  it("navigates to the add page when Add Service is clicked", async () => {
    const user = userEvent.setup();
    mockCategoryService();
    mockOfferingService();
    renderListing();

    await user.click(screen.getByRole("button", { name: "Add Service" }));
    expect(await screen.findByText("add service page")).toBeInTheDocument();
  });

  it("deleting an offering shows a confirmation dialog, calls deleteServiceOffering, and refreshes on success", async () => {
    const user = userEvent.setup();
    const deleteServiceOffering = vi.fn().mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    mockCategoryService();
    mockOfferingService(deleteServiceOffering);
    renderListing({ onRefresh });

    await user.click(screen.getAllByLabelText("Delete")[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteServiceOffering).toHaveBeenCalledWith(1));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Service deleted")).toBeInTheDocument();
  });

  it("hides Add/Edit/Delete when allowMutations is false", () => {
    mockCategoryService();
    mockOfferingService();
    renderListing({ allowMutations: false });

    expect(screen.queryByRole("button", { name: "Add Service" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete")).not.toBeInTheDocument();
    expect(screen.getByText("Browse Services")).toBeInTheDocument();
  });

  it("still shows the category filter when allowMutations is false", () => {
    mockCategoryService();
    mockOfferingService();
    renderListing({ allowMutations: false });

    expect(screen.getByLabelText("Category")).toBeInTheDocument();
  });
});
