import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useInputLogic } from "./useInputLogic";
import { QRConfig, QRType, QRStyle, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from "../../types";

const createMockConfig = (type: QRType, value: string): QRConfig => ({
  value,
  type,
  fgColor: "#000000",
  bgColor: "#ffffff",
  style: QRStyle.STANDARD,
  logoUrl: null,
  logoSize: 0.15,
  logoPaddingStyle: "square",
  logoPadding: 1,
  logoBackgroundColor: "#ffffff",
  eyeColor: "#000000",
  errorCorrectionLevel: QRErrorCorrectionLevel.H,
  isBorderEnabled: false,
  borderSize: 0.05,
  borderColor: "#000000",
  borderStyle: "none" as any,
  borderText: "",
  borderTextPosition: "bottom" as any,
  borderTextColor: "#000000",
  borderLogoUrl: null,
  borderLogoPosition: "bottom-right" as any,
  socialFormat: SocialFormat.SQUARE_1_1,
  templateStyle: TemplateStyle.NONE,
});

describe("useInputLogic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should synchronize state with a valid external value change", () => {
    const config = createMockConfig(QRType.TEXT, "Initial Text");
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ cfg }) => useInputLogic(cfg, onChange),
      { initialProps: { cfg: config } }
    );

    expect(result.current.inputProps.data).toEqual({ text: "Initial Text" });

    // Update config externally with a new text value
    const updatedConfig = createMockConfig(QRType.TEXT, "External Change");
    rerender({ cfg: updatedConfig });

    expect(result.current.inputProps.data).toEqual({ text: "External Change" });
  });

  it("should reset visual text and internal state to initialState synchronously when external reset occurs (Issue A)", () => {
    const config = createMockConfig(QRType.TEXT, "Stale Text");
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ cfg }) => useInputLogic(cfg, onChange),
      { initialProps: { cfg: config } }
    );

    expect(result.current.inputProps.data).toEqual({ text: "Stale Text" });

    // Simulate clearing / resetting the form externally
    const clearedConfig = createMockConfig(QRType.TEXT, "");
    rerender({ cfg: clearedConfig });

    // It should reset synchronously to initialState
    expect(result.current.inputProps.data).toEqual({ text: "" });
  });

  it("should cancel active input timers upon receiving an external configuration change, avoiding overwrite (Issue B)", () => {
    const config = createMockConfig(QRType.TEXT, "Original State");
    const onChange = vi.fn();

    const { result, rerender } = renderHook(
      ({ cfg }) => useInputLogic(cfg, onChange),
      { initialProps: { cfg: config } }
    );

    // User types something
    act(() => {
      result.current.inputProps.onChange({ text: "User Typed Something" });
    });

    // The state updates locally immediately
    expect(result.current.inputProps.data).toEqual({ text: "User Typed Something" });

    // Before debounce timer (100ms) fires, an external reset or change occurs
    const externalConfig = createMockConfig(QRType.TEXT, "Original State Restored");
    rerender({ cfg: externalConfig });

    // Advancing timers by 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Stale typed value must not overwrite the restored/external state
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.inputProps.data).toEqual({ text: "Original State Restored" });
  });

  it("should validate input locally and block onChange propagation if value is invalid (Issue C)", () => {
    // Let's test WifiInput with invalid SSID (control character)
    const config = createMockConfig(QRType.WIFI, "WIFI:T:WPA;S:MyWiFi;P:secret;;");
    const onChange = vi.fn();

    const { result } = renderHook(
      ({ cfg }) => useInputLogic(cfg, onChange),
      { initialProps: { cfg: config } }
    );

    // Initial SSID state
    expect((result.current.inputProps.data as any).ssid).toBe("MyWiFi");

    // Change to include invalid control character
    act(() => {
      result.current.inputProps.onChange({ ssid: "MyWiFi\u0001Network" });
    });

    // Advance timers by 200ms to trigger debounce
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Validation should fail and prevent the onChange callback from propagating
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should validate URL input locally and block onChange propagation if URL is dangerous", () => {
    const config = createMockConfig(QRType.URL, "https://example.com");
    const onChange = vi.fn();

    const { result } = renderHook(
      ({ cfg }) => useInputLogic(cfg, onChange),
      { initialProps: { cfg: config } }
    );

    expect((result.current.inputProps.data as any).url).toBe("https://example.com");

    // Change URL to a dangerous javascript URI
    act(() => {
      result.current.inputProps.onChange({ url: "javascript:alert(1)" });
    });

    // Advance timers by 200ms to trigger debounce
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Validation should fail and prevent the onChange callback from propagating
    expect(onChange).not.toHaveBeenCalled();
  });
});
