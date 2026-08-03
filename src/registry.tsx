import React, { Suspense } from 'react';
import InputPanel from '@/components/InputPanel';
import { SidebarContent } from '@/components/SidebarContent';
import { useQRStore, useQRStoreSelector } from '@/context/QRContext';

const StyleControls = React.lazy(() => import('@/components/StyleControls'));

const ContentControl = () => {
  const store = useQRStore();
  const config = useQRStoreSelector(state => state.config);
  const { updateConfig } = store;
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">Content</h2>
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
      <h2 className="mb-4 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">Appearance</h2>
      {isMounted ? (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}>
          <StyleControls config={config} onChange={updateConfig} />
        </Suspense>
      ) : (
        <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      )}
    </section>
  );
};

const AdditionalSidebarContent = ({ toolId }: { toolId?: string }) => {
  return <SidebarContent toolId={toolId || 'index'} />;
};

/**
 *
 */
export const sidebarControls = [
  {
    id: 'content',
    component: ContentControl,
  },
  {
    id: 'appearance',
    component: AppearanceControl,
  },
  {
    id: 'sidebar-content',
    component: AdditionalSidebarContent,
  },
];
