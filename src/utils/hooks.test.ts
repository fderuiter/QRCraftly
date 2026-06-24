/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useOnClickOutside, useDebounce, useImage } from "./hooks";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("should debounce value updates", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } },
    );

    // Update value
    rerender({ value: "updated", delay: 500 });

    // Should still be initial
    expect(result.current).toBe("initial");

    // Advance time by 200ms (less than delay)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("initial");

    // Advance time by 300ms (total 500ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("updated");
  });

  it("should reset timer if value changes before delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } },
    );

    // First update
    rerender({ value: "update1", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("initial");

    // Second update before timeout
    rerender({ value: "update2", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300); // Total 600ms from start, but only 300ms from second update
    });
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(200); // Total 500ms from second update
    });
    expect(result.current).toBe("update2");
  });
});

describe("useOnClickOutside", () => {
  let container: HTMLDivElement;
  let child: HTMLSpanElement;
  let ref: { current: HTMLDivElement };

  beforeEach(() => {
    container = document.createElement("div");
    child = document.createElement("span");
    container.appendChild(child);
    document.body.appendChild(container);
    ref = { current: container };
  });

  afterEach(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it("should call handler when clicking outside the element", () => {
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    // Click outside
    const outsideEvent = new MouseEvent("mousedown", { bubbles: true });
    document.dispatchEvent(outsideEvent);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should not call handler when clicking inside the element", () => {
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    // Click inside
    const insideEvent = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(insideEvent, "target", { value: child });
    document.dispatchEvent(insideEvent);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should not call handler when isActive is false", () => {
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler, false));

    const outsideEvent = new MouseEvent("mousedown", { bubbles: true });
    document.dispatchEvent(outsideEvent);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should clean up event listeners on unmount", () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useOnClickOutside(ref, handler));

    unmount();

    const outsideEvent = new MouseEvent("mousedown", { bubbles: true });
    document.dispatchEvent(outsideEvent);

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("useImage", () => {
  let originalImage: any;

  beforeEach(() => {
    originalImage = window.Image;
  });

  afterEach(() => {
    window.Image = originalImage;
  });

  it("should return null when url is null", () => {
    const { result } = renderHook(() => useImage(null));
    expect(result.current).toBeNull();
  });

  it("should successfully load an image", () => {
    let mockImg: any;
    window.Image = class {
      onload: any;
      onerror: any;
      src = "";
      complete = false;
      naturalHeight = 0;
      constructor() {
        mockImg = this;
      }
    } as any;

    const { result } = renderHook(() =>
      useImage("http://example.com/image.png"),
    );

    expect(result.current).toBeNull();

    act(() => {
      mockImg.onload();
    });

    expect(result.current).toBe(mockImg);
  });

  it("should return null if the image fails to load", () => {
    let mockImg: any;
    window.Image = class {
      onload: any;
      onerror: any;
      src = "";
      complete = false;
      naturalHeight = 0;
      constructor() {
        mockImg = this;
      }
    } as any;

    const { result } = renderHook(() =>
      useImage("http://example.com/image.png"),
    );

    act(() => {
      mockImg.onerror();
    });

    expect(result.current).toBeNull();
  });

  it("should handle cached images immediately", () => {
    let mockImg: any;
    window.Image = class {
      onload: any;
      onerror: any;
      src = "";
      complete = true;
      naturalHeight = 100; // Simulated as loaded
      constructor() {
        mockImg = this;
      }
    } as any;

    const { result } = renderHook(() =>
      useImage("http://example.com/image.png"),
    );

    expect(result.current).toBe(mockImg);
  });

  it("should clean up handlers on unmount", () => {
    let mockImg: any;
    window.Image = class {
      onload: any;
      onerror: any;
      src = "";
      complete = false;
      naturalHeight = 0;
      constructor() {
        mockImg = this;
      }
    } as any;

    const { unmount } = renderHook(() =>
      useImage("http://example.com/image.png"),
    );

    expect(mockImg.onload).not.toBeNull();
    expect(mockImg.onerror).not.toBeNull();

    unmount();

    expect(mockImg.onload).toBeNull();
    expect(mockImg.onerror).toBeNull();
  });
});
