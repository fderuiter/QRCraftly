import React, { Suspense } from 'react';
import InputPanel from '@/components/InputPanel';
import { SidebarContent } from '@/components/SidebarContent';
import { useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Stand-in for the appearance controls while their chunk loads: the open "Pattern & Colors"
 * section and the collapsed section headers below it, at their final heights.
 * @returns The loading placeholder.
 */
const AppearanceSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-96" />
    <Skeleton className="h-14" />
    <Skeleton className="h-14" />
    <Skeleton className="h-14" />
  </div>
);

const StyleControls = React.lazy(() => import('@/components/StyleControls'));

const ContentControl = () => {
  const store = useQRStore();
  // Select only the content slice so appearance changes do not re-render the input panel.
  const type = useQRStoreSelector(state => state.config.type);
  const value = useQRStoreSelector(state => state.config.value);
  const config = React.useMemo(() => ({ type, value }), [type, value]);
  const { updateConfig } = store;
  return (
    <section>
      <SectionHeading eyebrow="Content" className="mb-4" />
      <InputPanel config={config} onChange={updateConfig} />
    </section>
  );
};

const AppearanceControl = () => {
  const store = useQRStore();
  const config = useQRStoreSelector(state => state.config);
  const { updateConfig } = store;
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section>
      <SectionHeading eyebrow="Appearance" className="mb-4" />
      {isMounted ? (
        <Suspense fallback={<AppearanceSkeleton />}>
          <StyleControls config={config} onChange={updateConfig} />
        </Suspense>
      ) : (
        <AppearanceSkeleton />
      )}
    </section>
  );
};

const AdditionalSidebarContent = ({ toolId }: { toolId?: string }) => {
  return <SidebarContent toolId={toolId || 'index'} />;
};

/**
 * Where a generator control renders inside the shared tool workspace:
 * - `primary`: first in the control column (content entry), before the preview on mobile.
 * - `secondary`: after the preview on mobile, below the primary controls on desktop (appearance).
 * - `below`: full-width, article-width content below the workspace (how-to, FAQ).
 */
export type ControlPlacement = 'primary' | 'secondary' | 'below';

/**
 * Generator controls in render order, with their workspace placement.
 */
export const sidebarControls: Array<{ id: string; placement: ControlPlacement; component: React.ComponentType<{ toolId?: string }> }> = [
  {
    id: 'content',
    placement: 'primary',
    component: ContentControl,
  },
  {
    id: 'appearance',
    placement: 'secondary',
    component: AppearanceControl,
  },
  {
    id: 'sidebar-content',
    placement: 'below',
    component: AdditionalSidebarContent,
  },
];
