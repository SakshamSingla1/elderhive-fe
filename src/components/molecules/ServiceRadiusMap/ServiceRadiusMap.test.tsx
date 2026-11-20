import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mapInstances: Array<{ container: HTMLElement; addSource: ReturnType<typeof vi.fn>; addLayer: ReturnType<typeof vi.fn> }> = [];

// jsdom has no WebGL context, so mapboxgl.Map must never actually run in a test - this
// fake stands in for the handful of calls ServiceRadiusMap makes (constructor, on("load"),
// addSource/addLayer/getSource, remove) without touching real GL.
vi.mock("mapbox-gl", () => {
  class FakeMarker {
    setLngLat = vi.fn().mockReturnThis();
    addTo = vi.fn().mockReturnThis();
  }
  class FakeMap {
    addSource = vi.fn();
    addLayer = vi.fn();
    getSource = vi.fn(() => ({ setData: vi.fn() }));
    remove = vi.fn();
    panTo = vi.fn();
    constructor(options: { container: HTMLElement }) {
      mapInstances.push({ container: options.container, addSource: this.addSource, addLayer: this.addLayer });
    }
    on(event: string, cb: () => void) {
      if (event === "load") cb();
    }
  }
  return { default: { Map: FakeMap, Marker: FakeMarker, accessToken: "" } };
});

describe("ServiceRadiusMap", () => {
  beforeEach(() => {
    mapInstances.length = 0;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to a text note (no map) when no Mapbox token is configured, but the slider still works", async () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "");
    const { default: ServiceRadiusMap } = await import("./ServiceRadiusMap");
    const onRadiusChange = vi.fn();
    const user = userEvent.setup();

    render(<ServiceRadiusMap latitude={12.9716} longitude={77.5946} radiusKm={10} onRadiusChange={onRadiusChange} />);

    expect(screen.getByText(/map preview unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId("service-radius-map-canvas")).not.toBeInTheDocument();
    expect(mapInstances).toHaveLength(0);

    const slider = screen.getByRole("slider", { name: /service radius/i });
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(onRadiusChange).toHaveBeenCalledWith(11);
  });

  it("prompts to set a location first when no lat/long is set yet", async () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "");
    const { default: ServiceRadiusMap } = await import("./ServiceRadiusMap");

    render(<ServiceRadiusMap latitude={null} longitude={null} radiusKm={10} onRadiusChange={vi.fn()} />);

    expect(screen.getByText(/set your service location above/i)).toBeInTheDocument();
  });

  it("renders the Mapbox canvas with a marker and radius source when a token and location are both present", async () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "test-token");
    const { default: ServiceRadiusMap } = await import("./ServiceRadiusMap");

    render(<ServiceRadiusMap latitude={12.9716} longitude={77.5946} radiusKm={10} onRadiusChange={vi.fn()} />);

    expect(screen.getByTestId("service-radius-map-canvas")).toBeInTheDocument();
    expect(mapInstances).toHaveLength(1);
    expect(mapInstances[0].addSource).toHaveBeenCalledWith(
      "service-radius",
      expect.objectContaining({ type: "geojson" })
    );
    expect(mapInstances[0].addLayer).toHaveBeenCalled();
  });
});
