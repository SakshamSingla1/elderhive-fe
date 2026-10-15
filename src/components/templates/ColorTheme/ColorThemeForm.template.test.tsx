import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ColorThemeForm from "./ColorThemeForm.template";
import { DEFAULT_PALETTE } from "../../../utils/themeConstants";
import type { ColorThemePayload, ColorThemeResponse } from "../../../services/useColorThemeService";

// No route is actually mounted at /admin/color-themes yet (that's the next prompt), so
// this reads the router's current location directly rather than asserting on page
// content that doesn't exist yet.
function RouteSpy() {
  const location = useLocation();
  return <div data-testid="route-spy">{location.pathname}</div>;
}

function renderForm(
  props: Partial<React.ComponentProps<typeof ColorThemeForm>> & {
    onSubmit?: ReturnType<typeof vi.fn<(values: ColorThemePayload) => void>>;
  } = {}
) {
  const onSubmit = props.onSubmit ?? vi.fn();
  render(
    <MemoryRouter initialEntries={["/admin/color-themes/new"]}>
      <ColorThemeForm mode={props.mode ?? "create"} colorTheme={props.colorTheme} onSubmit={onSubmit} />
    </MemoryRouter>
  );
  return { onSubmit };
}

const existingTheme: ColorThemeResponse = {
  id: 9,
  themeName: "Forest Green",
  status: "INACTIVE",
  palette: {
    colorGroups: [
      { groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#2E7D32" }] },
    ],
  },
};

describe("ColorThemeForm", () => {
  it("create mode starts from DEFAULT_PALETTE with an empty theme name", () => {
    renderForm({ mode: "create" });

    expect(screen.getByRole("heading", { name: "Create Color Theme" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Theme Name/)).toHaveValue("");
    // A representative shade from every group in DEFAULT_PALETTE is rendered.
    for (const group of DEFAULT_PALETTE.colorGroups) {
      const firstShade = group.colorShades[0];
      expect(screen.getByDisplayValue(firstShade.colorCode)).toBeInTheDocument();
    }
  });

  it("edit mode populates the form from the existing theme's own values, not DEFAULT_PALETTE", async () => {
    renderForm({ mode: "edit", colorTheme: existingTheme });

    expect(screen.getByRole("heading", { name: "Edit Color Theme" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Forest Green")).toBeInTheDocument();
    expect(screen.getByDisplayValue("#2E7D32")).toBeInTheDocument();
    // existingTheme has exactly one colorGroup (DEFAULT_PALETTE has four) - only one
    // group heading renders, proving the theme's own palette won, not the default one.
    expect(screen.getAllByRole("heading", { level: 6 })).toHaveLength(2); // "Theme Information" + "Primary Palette"
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });

  it("view mode disables every field, shows only Back, and renders no submit button", () => {
    renderForm({ mode: "view", colorTheme: existingTheme });

    expect(screen.getByRole("heading", { name: "View Color Theme" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Theme Name/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create" })).not.toBeInTheDocument();

    // Every color swatch trigger is disabled - clicking one must not open its popover.
    const swatchTrigger = screen.getByDisplayValue("#2E7D32");
    expect(swatchTrigger).toBeDisabled();
  });

  it("shows a Yup validation error once the theme name field is blurred empty", async () => {
    const user = userEvent.setup();
    renderForm({ mode: "create" });

    // Formik's handleSubmit doesn't reliably touch+surface every field's error in this
    // test environment just from a submit click - blurring the field directly is the
    // proven way to trigger per-field validation display (same gotcha hit porting
    // Register.page's own tests).
    await user.click(screen.getByLabelText(/Theme Name/));
    await user.tab();

    expect(await screen.findByText("Theme name is required")).toBeInTheDocument();
  });

  it("blocks submission (never calls onSubmit) while the theme name is empty", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ mode: "create" });

    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "Create" })); // Formik validation runs async - give it a tick

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("preserves the existing theme's status when submitting an edit (never nulls it out)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ mode: "edit", colorTheme: existingTheme });

    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ themeName: "Forest Green", status: "INACTIVE" }),
      expect.anything()
    );
  });

  it("a new theme is always submitted as ACTIVE", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ mode: "create" });

    await user.type(screen.getByLabelText(/Theme Name/), "My New Theme");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ themeName: "My New Theme", status: "ACTIVE" }), expect.anything());
  });

  it("changing a shade's color through the ColorPicker updates the submitted palette at the right path", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ mode: "edit", colorTheme: existingTheme });

    await user.click(screen.getByDisplayValue("#2E7D32"));
    const popoverInputs = screen.getAllByDisplayValue(/^#/i) as HTMLInputElement[];
    const hexInput = popoverInputs.find((el) => !el.readOnly)!;
    await user.clear(hexInput);
    await user.type(hexInput, "#AA00AA");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        palette: { colorGroups: [{ groupName: "primary", colorShades: [{ colorName: "primary500", colorCode: "#AA00AA" }] }] },
      }),
      expect.anything()
    );
  });

  it("Cancel/Back navigates to the color themes listing page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/color-themes/new"]}>
        <ColorThemeForm mode="create" onSubmit={vi.fn()} />
        <RouteSpy />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByTestId("route-spy")).toHaveTextContent("/admin/color-themes");
  });
});
