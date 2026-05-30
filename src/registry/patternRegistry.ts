import { QRStyle } from '../types';

export interface PatternMetadata {
  id: QRStyle;
  label: string;
}

class PatternRegistryClass {
  private patterns: Map<QRStyle, PatternMetadata> = new Map();

  register(pattern: PatternMetadata) {
    this.patterns.set(pattern.id, pattern);
  }

  get(id: QRStyle): PatternMetadata | undefined {
    return this.patterns.get(id);
  }

  getAll(): PatternMetadata[] {
    return Array.from(this.patterns.values());
  }
}

export const PatternRegistry = new PatternRegistryClass();

// Initialize registry with all pattern properties
PatternRegistry.register({ id: QRStyle.STANDARD, label: 'Standard Industrial' });
PatternRegistry.register({ id: QRStyle.MODERN, label: 'Modern Soft' });
PatternRegistry.register({ id: QRStyle.SWISS, label: 'Swiss Dot' });
PatternRegistry.register({ id: QRStyle.FLUID, label: 'Fluid Ink' });
PatternRegistry.register({ id: QRStyle.CIRCUIT, label: 'Cyber Circuit' });
PatternRegistry.register({ id: QRStyle.HIVE, label: 'The Hive' });
PatternRegistry.register({ id: QRStyle.GRUNGE, label: 'Grunge' });
PatternRegistry.register({ id: QRStyle.STARBURST, label: 'Starburst' });
