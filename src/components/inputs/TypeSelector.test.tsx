import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TypeSelector } from "./TypeSelector";
import { QRType } from "../../types";

describe("TypeSelector Component Accessibility & Keyboard Navigation", () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    document.body.innerHTML = "";
  });

  it("renders the container as role='tablist' with proper label", () => {
    render(<TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />);
    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute("aria-label", "QR Code Types");
  });

  it("renders all individual choices with role='tab'", () => {
    render(<TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(12);
  });

  it("uses role='presentation' for list items (li) to strip list semantics", () => {
    const { container } = render(
      <TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />
    );
    const lis = container.querySelectorAll("li");
    lis.forEach((li) => {
      expect(li).toHaveAttribute("role", "presentation");
    });
  });

  it("correctly sets aria-selected and doesn't use aria-pressed or aria-current", () => {
    const { container } = render(
      <TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />
    );
    const tabs = screen.getAllByRole("tab");
    
    // Active tab
    const urlTab = screen.getByRole("tab", { name: "URL" });
    expect(urlTab).toHaveAttribute("aria-selected", "true");
    expect(urlTab).not.toHaveAttribute("aria-current");
    expect(urlTab).not.toHaveAttribute("aria-pressed");

    // Inactive tab
    const textTab = screen.getByRole("tab", { name: "Text" });
    expect(textTab).toHaveAttribute("aria-selected", "false");
    expect(textTab).not.toHaveAttribute("aria-current");
    expect(textTab).not.toHaveAttribute("aria-pressed");
  });

  it("assigns matching id and aria-controls attributes for programmatic linking", () => {
    render(<TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />);
    const urlTab = screen.getByRole("tab", { name: "URL" });
    expect(urlTab).toHaveAttribute("id", "tab-URL");
    expect(urlTab).toHaveAttribute("aria-controls", "panel-URL");
  });

  it("implements roving tabIndex (only active tab has tabIndex=0, others -1)", () => {
    render(<TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />);
    const urlTab = screen.getByRole("tab", { name: "URL" });
    const textTab = screen.getByRole("tab", { name: "Text" });

    expect(urlTab).toHaveAttribute("tabIndex", "0");
    expect(textTab).toHaveAttribute("tabIndex", "-1");
  });

  it("navigates focus and triggers selection on Left and Right Arrow keys with wrapping", () => {
    render(<TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />);
    const tablist = screen.getByRole("tablist");
    const tabs = screen.getAllByRole("tab");

    // Start focus on first tab
    tabs[0].focus();
    expect(document.activeElement).toBe(tabs[0]);

    // Press ArrowRight -> moves to index 1 (Text)
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[1]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.TEXT);

    // Press ArrowLeft -> moves back to index 0 (URL)
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tabs[0]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.URL);

    // Press ArrowLeft on first tab -> wraps to last tab (Social)
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tabs[11]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.SOCIAL);

    // Press ArrowRight on last tab -> wraps to first tab (URL)
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[0]);
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.URL);
  });

  it("activates tab and triggers onSelect callback on Space or Enter keys", () => {
    render(<TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />);
    const tablist = screen.getByRole("tablist");
    const tabs = screen.getAllByRole("tab");

    // Focus WiFi tab (index 2)
    tabs[2].focus();

    // Press Space
    fireEvent.keyDown(tablist, { key: " " });
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.WIFI);

    // Press Enter
    fireEvent.keyDown(tablist, { key: "Enter" });
    expect(mockOnSelect).toHaveBeenCalledWith(QRType.WIFI);
  });

  it("moves focus to the first interactive field inside the tabpanel when Tab is pressed from a tab", () => {
    // Set up a mock panel in the document body to simulate the DOM structure
    const panel = document.createElement("div");
    panel.id = "panel-URL";
    panel.setAttribute("role", "tabpanel");
    
    const input = document.createElement("input");
    input.id = "website-url";
    panel.appendChild(input);
    document.body.appendChild(panel);

    render(<TypeSelector currentType={QRType.URL} onSelect={mockOnSelect} />);
    const tablist = screen.getByRole("tablist");
    const tabs = screen.getAllByRole("tab");

    tabs[0].focus();
    expect(document.activeElement).toBe(tabs[0]);

    // Press Tab
    fireEvent.keyDown(tablist, { key: "Tab" });
    expect(document.activeElement).toBe(input);
  });
});
