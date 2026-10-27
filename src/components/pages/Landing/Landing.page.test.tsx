import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./Landing.page";
import { useLandingService } from "../../../services/useLandingService";
import type { LandingPageResponse } from "../../../services/useLandingService";
import { useContactUsService } from "../../../services/useContactUsService";

vi.mock("../../../services/useLandingService", () => ({
  useLandingService: vi.fn(),
}));
vi.mock("../../../services/useContactUsService", () => ({
  useContactUsService: vi.fn(),
}));

const mockedUseLandingService = vi.mocked(useLandingService);
const mockedUseContactUsService = vi.mocked(useContactUsService);

function emptyPage(): LandingPageResponse {
  return { config: null, features: [], faqs: [], testimonials: [] };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe("Landing.page", () => {
  let submit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    submit = vi.fn().mockResolvedValue({ id: 1, status: "NEW" });
    mockedUseContactUsService.mockReturnValue({ submit, search: vi.fn(), updateStatus: vi.fn(), remove: vi.fn() } as unknown as ReturnType<
      typeof useContactUsService
    >);
  });

  it("falls back to built-in copy and sample content when the CMS has nothing saved yet", async () => {
    mockedUseLandingService.mockReturnValue({
      getPublicPage: vi.fn().mockResolvedValue(emptyPage()),
      updateConfig: vi.fn(),
      getAllFeatures: vi.fn(),
      createFeature: vi.fn(),
      updateFeature: vi.fn(),
      deleteFeature: vi.fn(),
      getAllFaqs: vi.fn(),
      createFaq: vi.fn(),
      updateFaq: vi.fn(),
      deleteFaq: vi.fn(),
      getAllTestimonials: vi.fn(),
      createTestimonial: vi.fn(),
      updateTestimonial: vi.fn(),
      deleteTestimonial: vi.fn(),
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Compassionate Care, Coordinated Together" })).toBeInTheDocument();
    expect(screen.getByText("Book Trusted Care")).toBeInTheDocument();
    expect(screen.getByText("How are caretakers verified?")).toBeInTheDocument();
  });

  it("prefers real CMS content over the fallback copy once it's saved", async () => {
    mockedUseLandingService.mockReturnValue({
      getPublicPage: vi.fn().mockResolvedValue({
        config: { id: 1, heroHeadline: "Welcome to ElderHive", ctaButtonText: "Join Now" },
        features: [{ id: 1, title: "Custom Feature", description: "desc", iconName: "star", isActive: true }],
        faqs: [{ id: 1, question: "Custom question?", answer: "Custom answer", isActive: true }],
        testimonials: [],
      }),
      updateConfig: vi.fn(),
      getAllFeatures: vi.fn(),
      createFeature: vi.fn(),
      updateFeature: vi.fn(),
      deleteFeature: vi.fn(),
      getAllFaqs: vi.fn(),
      createFaq: vi.fn(),
      updateFaq: vi.fn(),
      deleteFaq: vi.fn(),
      getAllTestimonials: vi.fn(),
      createTestimonial: vi.fn(),
      updateTestimonial: vi.fn(),
      deleteTestimonial: vi.fn(),
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Welcome to ElderHive" })).toBeInTheDocument();
    expect(screen.getByText("Custom Feature")).toBeInTheDocument();
    expect(screen.getByText("Custom question?")).toBeInTheDocument();
    expect(screen.queryByText("Book Trusted Care")).not.toBeInTheDocument();
  });

  it("submits the contact form and shows a success message", async () => {
    const user = userEvent.setup();
    mockedUseLandingService.mockReturnValue({
      getPublicPage: vi.fn().mockResolvedValue(emptyPage()),
      updateConfig: vi.fn(),
      getAllFeatures: vi.fn(),
      createFeature: vi.fn(),
      updateFeature: vi.fn(),
      deleteFeature: vi.fn(),
      getAllFaqs: vi.fn(),
      createFaq: vi.fn(),
      updateFaq: vi.fn(),
      deleteFaq: vi.fn(),
      getAllTestimonials: vi.fn(),
      createTestimonial: vi.fn(),
      updateTestimonial: vi.fn(),
      deleteTestimonial: vi.fn(),
    });
    renderPage();

    await screen.findByLabelText(/^Full Name/);
    await user.type(screen.getByLabelText(/^Full Name/), "Jane Doe");
    await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
    await user.type(screen.getByLabelText(/^Message/), "Hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith({ name: "Jane Doe", email: "jane@example.com", phone: "", message: "Hello there" })
    );
    expect(await screen.findByText(/Thanks for reaching out/)).toBeInTheDocument();
  });

  it("shows an error when the contact form submission fails", async () => {
    const user = userEvent.setup();
    submit.mockRejectedValue(new Error("Could not submit your message. Please try again."));
    mockedUseLandingService.mockReturnValue({
      getPublicPage: vi.fn().mockResolvedValue(emptyPage()),
      updateConfig: vi.fn(),
      getAllFeatures: vi.fn(),
      createFeature: vi.fn(),
      updateFeature: vi.fn(),
      deleteFeature: vi.fn(),
      getAllFaqs: vi.fn(),
      createFaq: vi.fn(),
      updateFaq: vi.fn(),
      deleteFaq: vi.fn(),
      getAllTestimonials: vi.fn(),
      createTestimonial: vi.fn(),
      updateTestimonial: vi.fn(),
      deleteTestimonial: vi.fn(),
    });
    renderPage();

    await screen.findByLabelText(/^Full Name/);
    await user.type(screen.getByLabelText(/^Full Name/), "Jane Doe");
    await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
    await user.type(screen.getByLabelText(/^Message/), "Hello there");
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    expect(await screen.findByText("Could not submit your message. Please try again.")).toBeInTheDocument();
  });
});
