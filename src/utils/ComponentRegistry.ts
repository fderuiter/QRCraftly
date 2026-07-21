import React from 'react';

export type ComponentRegistryItem = {
  id: string;
  component: React.ComponentType<any>;
  order?: number;
};

class ComponentRegistryClass {
  private sidebarControls: ComponentRegistryItem[] = [];

  registerSidebarControl(item: ComponentRegistryItem) {
    this.sidebarControls.push(item);
    this.sidebarControls.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getSidebarControls() {
    return this.sidebarControls;
  }
}

export const ComponentRegistry = new ComponentRegistryClass();
