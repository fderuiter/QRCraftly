// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { announcementManager, AnnouncementItem, AnnouncementPriority } from './announcementManager';

describe('AnnouncementManager Central Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    announcementManager.reset();
    const politeEl = document.getElementById('dynamic-focus-live-region');
    if (politeEl) politeEl.remove();
    const assertiveEl = document.getElementById('dynamic-focus-live-region-assertive');
    if (assertiveEl) assertiveEl.remove();
  });

  afterEach(() => {
    vi.useRealTimers();
    announcementManager.reset();
    const politeEl = document.getElementById('dynamic-focus-live-region');
    if (politeEl) politeEl.remove();
    const assertiveEl = document.getElementById('dynamic-focus-live-region-assertive');
    if (assertiveEl) assertiveEl.remove();
  });

  it('sequences multiple polite announcements without dropping or truncating prior messages', () => {
    announcementManager.announcePolitely('Message 1');
    announcementManager.announcePolitely('Message 2');

    const politeEl = document.getElementById('dynamic-focus-live-region');
    expect(politeEl).not.toBeNull();
    expect(politeEl?.getAttribute('aria-live')).toBe('polite');

    // Message 1 processes first (50ms delay to set text)
    vi.advanceTimersByTime(50);
    expect(politeEl?.textContent).toBe('Message 1');

    // Now queue Message 3
    announcementManager.announcePolitely('Message 3');

    // Message 2 processes next (50ms delay)
    vi.advanceTimersByTime(50);
    expect(politeEl?.textContent).toBe('Message 2');

    // Message 3 processes after display duration (1000ms display + 50ms initial delay)
    vi.advanceTimersByTime(1050);
    expect(politeEl?.textContent).toBe('Message 3');
  });

  it('assertive announcements interrupt and preempt lower priority polite announcements', () => {
    announcementManager.announcePolitely('Polite Status Update');
    vi.advanceTimersByTime(50);

    const politeEl = document.getElementById('dynamic-focus-live-region');
    expect(politeEl?.textContent).toBe('Polite Status Update');

    // Trigger high-priority assertive alert
    announcementManager.announceAssertively('CRITICAL ALERT: Session Expired');

    const assertiveEl = document.getElementById('dynamic-focus-live-region-assertive');
    expect(assertiveEl).not.toBeNull();
    expect(assertiveEl?.getAttribute('aria-live')).toBe('assertive');
    expect(assertiveEl?.getAttribute('role')).toBe('alert');

    vi.advanceTimersByTime(50);
    expect(assertiveEl?.textContent).toBe('CRITICAL ALERT: Session Expired');
  });

  it('ignores empty messages', () => {
    const priority: AnnouncementPriority = 'polite';
    const mockItem: AnnouncementItem = { id: '1', message: 'test', priority, timestamp: Date.now() };
    expect(mockItem.priority).toBe('polite');

    announcementManager.announcePolitely('');
    const politeEl = document.getElementById('dynamic-focus-live-region');
    expect(politeEl).toBeNull();
  });
});
