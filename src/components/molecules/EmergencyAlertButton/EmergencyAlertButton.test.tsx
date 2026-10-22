import { render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmergencyAlertButton from "./EmergencyAlertButton";

const HOLD_MS = 1000;

describe("EmergencyAlertButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not confirm on a quick tap released well before the hold duration", () => {
    const onConfirm = vi.fn();
    render(
      <EmergencyAlertButton onConfirm={onConfirm} holdDurationMs={HOLD_MS}>
        SOS
      </EmergencyAlertButton>
    );
    const button = screen.getByRole("button", { name: "SOS" });

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(200));
    fireEvent.pointerUp(button);
    act(() => vi.advanceTimersByTime(HOLD_MS));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms once held for the full duration", () => {
    const onConfirm = vi.fn();
    render(
      <EmergencyAlertButton onConfirm={onConfirm} holdDurationMs={HOLD_MS}>
        SOS
      </EmergencyAlertButton>
    );
    const button = screen.getByRole("button", { name: "SOS" });

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(HOLD_MS));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("resets and does not confirm if the pointer leaves mid-hold", () => {
    const onConfirm = vi.fn();
    render(
      <EmergencyAlertButton onConfirm={onConfirm} holdDurationMs={HOLD_MS}>
        SOS
      </EmergencyAlertButton>
    );
    const button = screen.getByRole("button", { name: "SOS" });

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerLeave(button);
    act(() => vi.advanceTimersByTime(HOLD_MS));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("a second press after an early release starts a fresh hold and can still confirm", () => {
    const onConfirm = vi.fn();
    render(
      <EmergencyAlertButton onConfirm={onConfirm} holdDurationMs={HOLD_MS}>
        SOS
      </EmergencyAlertButton>
    );
    const button = screen.getByRole("button", { name: "SOS" });

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerUp(button);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(HOLD_MS));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("ignores presses entirely while disabled or loading", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <EmergencyAlertButton onConfirm={onConfirm} holdDurationMs={HOLD_MS} disabled>
        SOS
      </EmergencyAlertButton>
    );
    fireEvent.pointerDown(screen.getByRole("button", { name: "SOS" }));
    act(() => vi.advanceTimersByTime(HOLD_MS));
    expect(onConfirm).not.toHaveBeenCalled();

    rerender(
      <EmergencyAlertButton onConfirm={onConfirm} holdDurationMs={HOLD_MS} loading>
        SOS
      </EmergencyAlertButton>
    );
    fireEvent.pointerDown(screen.getByRole("button", { name: "SOS" }));
    act(() => vi.advanceTimersByTime(HOLD_MS));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms when Enter is held for the full duration but not when released early", () => {
    const onConfirm = vi.fn();
    render(
      <EmergencyAlertButton onConfirm={onConfirm} holdDurationMs={HOLD_MS}>
        SOS
      </EmergencyAlertButton>
    );
    const button = screen.getByRole("button", { name: "SOS" });

    fireEvent.keyDown(button, { key: "Enter" });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.keyUp(button, { key: "Enter" });
    act(() => vi.advanceTimersByTime(HOLD_MS));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { key: "Enter" });
    act(() => vi.advanceTimersByTime(HOLD_MS));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("best-effort vibrates the device on confirm without throwing when unsupported", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    const onConfirm = vi.fn();
    render(
      <EmergencyAlertButton onConfirm={onConfirm} holdDurationMs={HOLD_MS}>
        SOS
      </EmergencyAlertButton>
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "SOS" }));
    act(() => vi.advanceTimersByTime(HOLD_MS));

    expect(vibrate).toHaveBeenCalledWith([30, 25, 60]);
  });

  it("shows a 'keep holding' hint only while actively held", () => {
    render(
      <EmergencyAlertButton onConfirm={vi.fn()} holdDurationMs={HOLD_MS}>
        SOS
      </EmergencyAlertButton>
    );
    expect(screen.getByText("Press and hold to send")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "SOS" }));
    expect(screen.getByText("Keep holding to confirm…")).toBeInTheDocument();

    fireEvent.pointerUp(screen.getByRole("button", { name: "SOS" }));
    expect(screen.getByText("Press and hold to send")).toBeInTheDocument();
  });
});
