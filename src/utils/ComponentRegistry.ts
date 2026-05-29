import React from 'react';

export type ComponentRegistryItem = {
  id: string;
  component: React.ComponentType<any>;
  order?: number;
};

class ComponentRegistryClass {
  private sidebarControls: ComponentRegistryItem[] = [];
  private previewActions: ComponentRegistryItem[] = [];

  registerSidebarControl(item: ComponentRegistryItem) {
    this.sidebarControls.push(item);
    this.sidebarControls.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  registerPreviewAction(item: ComponentRegistryItem) {
    this.previewActions.push(item);
    this.previewActions.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getSidebarControls() {
    return this.sidebarControls;
  }

  getPreviewActions() {
    return this.previewActions;
  }
}

export const ComponentRegistry = new ComponentRegistryClass();
