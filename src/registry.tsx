import React, { Suspense } from "react";
import { ComponentRegistry } from "@/utils/ComponentRegistry";
import InputPanel from "@/components/InputPanel";
import { SidebarContent } from "@/components/SidebarContent";
import { useQRStore, useQRStoreSelector } from "@/context/QRContext";

const StyleControls = React.lazy(() => import("@/components/StyleControls"));

const ContentControl = () => {
  const store = useQRStore();
  const config = useQRStoreSelector((state) => state.config);
  const { updateConfig } = store;
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold mb-4">
        Content
      </h2>
      <InputPanel config={config} onChange={updateConfig} />
    </section>
  );
};

const AppearanceControl = () => {
  const store = useQRStore();
  const config = useQRStoreSelector((state) => state.config);
  const { updateConfig } = store;
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold mb-4">
        Appearance
      </h2>
      {isMounted ? (
        <Suspense
          fallback={
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          }
        >
          <StyleControls config={config} onChange={updateConfig} />
        </Suspense>
      ) : (
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      )}
    </section>
  );
};

const AdditionalSidebarContent = ({ toolId }: { toolId?: string }) => {
  return <SidebarContent toolId={toolId || "index"} />;
};

ComponentRegistry.registerSidebarControl({
  id: "content",
  component: ContentControl,
  order: 10,
});

ComponentRegistry.registerSidebarControl({
  id: "appearance",
  component: AppearanceControl,
  order: 20,
});

ComponentRegistry.registerSidebarControl({
  id: "sidebar-content",
  component: AdditionalSidebarContent,
  order: 30,
});
