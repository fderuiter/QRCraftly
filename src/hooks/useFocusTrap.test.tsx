import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

function Trap({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div ref={ref}>
      <button type="button">Inside</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function setup() {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const opener = document.createElement('button');
    opener.textContent = 'Opener';
    const other = document.createElement('button');
    other.textContent = 'Other';
    document.body.append(opener, other);
    opener.focus();
    const flush = () => act(() => frames.splice(0).forEach((cb) => cb(0)));
    return { opener, other, flush };
  }

  it('returns focus to the element focused before it opened', () => {
    const { opener, flush } = setup();
    const { rerender } = render(<Trap active />);
    flush();
    expect(document.activeElement?.textContent).toBe('Inside');
    rerender(<Trap active={false} />);
    flush();
    expect(document.activeElement).toBe(opener);
  });

  it('does not take focus back from an element focused on purpose after closing', () => {
    const { other, flush } = setup();
    const { rerender } = render(<Trap active />);
    flush();
    rerender(<Trap active={false} />);
    // Another component moves focus before the next frame (as the site menu does with its button).
    other.focus();
    flush();
    expect(document.activeElement).toBe(other);
  });
});
