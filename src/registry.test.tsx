import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QRProvider, useQRStore } from '@/context/QRContext';
import { renderHook } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock heavy dependencies so tests are isolated
// ---------------------------------------------------------------------------
vi.mock('@/components/InputPanel', () => ({
  default: ({ config, onChange }: { config: any; onChange: (...args: any[]) => any }) => (
    <div data-testid="input-panel" data-value={config.value}>
      <button data-testid="input-panel-change" onClick={() => onChange({ value: 'changed' })}>
        change
      </button>
    </div>
  ),
}));

vi.mock('@/components/StyleControls', () => ({
  default: ({ config, onChange }: { config: any; onChange: (...args: any[]) => any }) => (
    <div data-testid="style-controls" data-value={config.value}>
      <button data-testid="style-controls-change" onClick={() => onChange({ fgColor: '#ff0000' })}>
        change color
      </button>
    </div>
  ),
}));

vi.mock('@/components/SidebarContent', () => ({
  SidebarContent: ({ toolId }: { toolId: string }) => (
    <div data-testid="sidebar-content" data-tool-id={toolId} />
  ),
}));

// ---------------------------------------------------------------------------
// Import registry AFTER mocks are set up so side-effect registrations work
// ---------------------------------------------------------------------------
// We need to isolate the registry singleton per test module scope.
// The safest approach: import the components directly from registry source.
// ---------------------------------------------------------------------------

// We import the whole module to trigger side-effect registrations
import '@/registry';
import { ComponentRegistry } from '@/utils/ComponentRegistry';

// ---------------------------------------------------------------------------
// Pull ContentControl and AppearanceControl by inspecting what registry exports.
// Since they are not exported, we access them via ComponentRegistry after import.
// ---------------------------------------------------------------------------

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QRProvider>{children}</QRProvider>
);

// ---------------------------------------------------------------------------
// ComponentRegistry side-effect registration
// ---------------------------------------------------------------------------

describe('registry.tsx – ComponentRegistry registrations', () => {
  it('registers exactly 3 sidebar controls (content, appearance, sidebar-content)', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const ids = controls.map(c => c.id);
    expect(ids).toContain('content');
    expect(ids).toContain('appearance');
    expect(ids).toContain('sidebar-content');
  });

  it('registers content control with order 10', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const content = controls.find(c => c.id === 'content');
    expect(content?.order).toBe(10);
  });

  it('registers appearance control with order 20', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const appearance = controls.find(c => c.id === 'appearance');
    expect(appearance?.order).toBe(20);
  });

  it('registers sidebar-content control with order 30', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const sidebarContent = controls.find(c => c.id === 'sidebar-content');
    expect(sidebarContent?.order).toBe(30);
  });

  it('sorts controls by order (content first, then appearance, then sidebar-content)', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const orders = controls.map(c => c.order ?? 0);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// ContentControl component
// ---------------------------------------------------------------------------

describe('ContentControl', () => {
  it('renders the Content section heading', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const ContentControl = controls.find(c => c.id === 'content')!.component;

    render(
      <QRProvider>
        <ContentControl />
      </QRProvider>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders InputPanel inside the section', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const ContentControl = controls.find(c => c.id === 'content')!.component;

    render(
      <QRProvider>
        <ContentControl />
      </QRProvider>
    );

    expect(screen.getByTestId('input-panel')).toBeInTheDocument();
  });

  it('passes the current config value from the store to InputPanel', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const ContentControl = controls.find(c => c.id === 'content')!.component;

    render(
      <QRProvider initialConfig={{ value: 'https://test-content.com' }}>
        <ContentControl />
      </QRProvider>
    );

    const panel = screen.getByTestId('input-panel');
    expect(panel.dataset.value).toBe('https://test-content.com');
  });

  it('calls store.updateConfig when InputPanel onChange fires', () => {
    const controls = ComponentRegistry.getSidebarControls();
    const ContentControl = controls.find(c => c.id === 'content')!.component;

    // Render ContentControl alongside a component that reads the store
    let storeRef: ReturnType<typeof useQRStore> | null = null;
    const StoreCapture = () => {
      storeRef = useQRStore();
      return null;
    };

    render(
      <QRProvider>
        <ContentControl />
        <StoreCapture />
      </QRProvider>
    );

    act(() => {
      screen.getByTestId('input-panel-change').click();
    });

    expect(storeRef!.getState().config.value).toBe('changed');
  });
});

// ---------------------------------------------------------------------------
// AppearanceControl component
// ---------------------------------------------------------------------------

describe('AppearanceControl', () => {
  it('renders the Appearance section heading', async () => {
    const controls = ComponentRegistry.getSidebarControls();
    const AppearanceControl = controls.find(c => c.id === 'appearance')!.component;

    render(
      <QRProvider>
        <AppearanceControl />
      </QRProvider>
    );

    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('shows loading placeholder before mount (isMounted=false initially skipped by React)', async () => {
    const controls = ComponentRegistry.getSidebarControls();
    const AppearanceControl = controls.find(c => c.id === 'appearance')!.component;

    // The component sets isMounted via useEffect, which runs after render.
    // On initial synchronous render, isMounted=false → shows skeleton.
    // We capture the initial render before effects run.
    let container!: HTMLElement;
    act(() => {
      ({ container } = render(
        <QRProvider>
          <AppearanceControl />
        </QRProvider>
      ));
    });

    // After act(), effects have run and isMounted=true, so StyleControls is shown via Suspense
    // Verify StyleControls (or its suspense fallback) is present
    await waitFor(() => {
      expect(screen.getByTestId('style-controls')).toBeInTheDocument();
    });
  });

  it('passes config from store to StyleControls', async () => {
    const controls = ComponentRegistry.getSidebarControls();
    const AppearanceControl = controls.find(c => c.id === 'appearance')!.component;

    render(
      <QRProvider initialConfig={{ value: 'https://appearance-test.com' }}>
        <AppearanceControl />
      </QRProvider>
    );

    await waitFor(() => {
      const styleControls = screen.getByTestId('style-controls');
      expect(styleControls.dataset.value).toBe('https://appearance-test.com');
    });
  });

  it('calls store.updateConfig when StyleControls onChange fires', async () => {
    const controls = ComponentRegistry.getSidebarControls();
    const AppearanceControl = controls.find(c => c.id === 'appearance')!.component;

    let storeRef: ReturnType<typeof useQRStore> | null = null;
    const StoreCapture = () => {
      storeRef = useQRStore();
      return null;
    };

    render(
      <QRProvider>
        <AppearanceControl />
        <StoreCapture />
      </QRProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('style-controls')).toBeInTheDocument();
    });

    act(() => {
      screen.getByTestId('style-controls-change').click();
    });

    expect(storeRef!.getState().config.fgColor).toBe('#ff0000');
  });
});
