import { SocialFormat } from '../types';
import { getAspectRatioCss } from './templateRenderer';

class LayoutRegistryClass {
  private registry: Map<string, string> = new Map();
  // Default dimension for unregistered modules to prevent layout collapse
  private defaultAspectRatio: string = getAspectRatioCss(SocialFormat.SQUARE_1_1);

  /**
   * Registers a module type mapped to a standard social format.
   */
  registerFormat(moduleType: string, format: SocialFormat): void {
    this.registry.set(moduleType, getAspectRatioCss(format));
  }

  /**
   * Registers a module type with a custom aspect ratio string.
   */
  registerCustom(moduleType: string, aspectRatio: string): void {
    this.registry.set(moduleType, aspectRatio);
  }

  /**
   * Retrieves the required CSS aspect-ratio string for the specified module type.
   * If unregistered, returns a default aspect ratio.
   */
  getAspectRatio(moduleType: string): string {
    return this.registry.get(moduleType) || this.defaultAspectRatio;
  }
}

export const LayoutRegistry = new LayoutRegistryClass();

// Register the required search module types to prevent layout shifts
LayoutRegistry.registerFormat('DCO', SocialFormat.PORTRAIT_4_5);
LayoutRegistry.registerFormat('Precision+', SocialFormat.SQUARE_1_1);
LayoutRegistry.registerFormat('Ad', SocialFormat.LANDSCAPE_16_9);
LayoutRegistry.registerFormat('RadioTile', SocialFormat.SQUARE_1_1);
