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

import { render, screen, fireEvent, act } from "@testing-library/react";
import InputPanel from "./InputPanel";
import { DEFAULT_CONFIG } from "../constants";
import { QRType } from "../types";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("InputPanel Security (Input Limits)", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enforces maxLength on URL input", () => {
    render(
      <InputPanel
        config={{ ...DEFAULT_CONFIG, type: QRType.URL }}
        onChange={mockOnChange}
      />,
    );
    const input = screen.getByLabelText("Website URL");
    expect(input).toHaveAttribute("maxLength", "2048");
  });

  it("enforces maxLength on Text content", () => {
    render(
      <InputPanel
        config={{ ...DEFAULT_CONFIG, type: QRType.TEXT }}
        onChange={mockOnChange}
      />,
    );
    const input = screen.getByLabelText("Content");
    expect(input).toHaveAttribute("maxLength", "2500");
  });

  it("enforces maxLength on WiFi inputs", () => {
    render(
      <InputPanel
        config={{ ...DEFAULT_CONFIG, type: QRType.WIFI }}
        onChange={mockOnChange}
      />,
    );

    const ssid = screen.getByLabelText("Network Name (SSID)");
    expect(ssid).toHaveAttribute("maxLength", "32");

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("maxLength", "63");
  });

  it("enforces maxLength on Email inputs", () => {
    render(
      <InputPanel
        config={{ ...DEFAULT_CONFIG, type: QRType.EMAIL }}
        onChange={mockOnChange}
      />,
    );

    const email = screen.getByLabelText("Email Address");
    expect(email).toHaveAttribute("maxLength", "254"); // RFC 5321

    const subject = screen.getByLabelText("Subject");
    expect(subject).toHaveAttribute("maxLength", "200");

    const body = screen.getByLabelText("Body");
    expect(body).toHaveAttribute("maxLength", "2000");
  });

  it("rejects dangerous protocols in URL input", () => {
    const config = {
      ...DEFAULT_CONFIG,
      type: QRType.URL,
      value: "https://safe.com",
    };
    render(<InputPanel config={config} onChange={mockOnChange} />);

    const input = screen.getByLabelText("Website URL");

    // Safe update
    fireEvent.change(input, { target: { value: "https://safe.com/test" } });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      value: "https://safe.com/test",
    });

    mockOnChange.mockClear();

    // Dangerous update
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
