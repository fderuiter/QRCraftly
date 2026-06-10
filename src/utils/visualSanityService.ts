export class VisualSanityService {
  static countGraphemes(str: string): number {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    let count = 0;
    for (const _ of segmenter.segment(str)) {
      count++;
    }
    return count;
  }

  static measureTextWidth(text: string, font: string): number {
    if (typeof document === 'undefined') return text.length * 10; // Fallback
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return text.length * 10;
    context.font = font;
    return context.measureText(text).width;
  }

  static hasBidiOverrides(text: string): boolean {
    // Detect BiDi overrides that might break layout
    const bidiRegex = /[\u202A-\u202E\u2066-\u2069]/;
    return bidiRegex.test(text);
  }

  static checkHealth(text: string, options?: { font?: string, maxWidth?: number }): { isHealthy: boolean; warnings: string[] } {
    const warnings = [];
    if (this.hasBidiOverrides(text)) {
      warnings.push('Contains BiDi control characters which may cause unstable rendering.');
    }
    
    if (options?.font && options?.maxWidth) {
      const width = this.measureTextWidth(text, options.font);
      if (width > options.maxWidth) {
        warnings.push('Text is too long and will be compressed or overlap other elements.');
      }
    }

    return {
      isHealthy: warnings.length === 0,
      warnings
    };
  }

  static checkComplexity(text: string): boolean {
    // A string exceeding 5000 graphemes is considered too complex for SVG serialization,
    // as it might exhaust memory or break SVG viewers.
    const MEMORY_COMPLEXITY_THRESHOLD = 5000;
    return this.countGraphemes(text) > MEMORY_COMPLEXITY_THRESHOLD;
  }

  static sliceByGraphemes(str: string, maxGraphemes: number): string {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    let result = '';
    let count = 0;
    for (const segment of segmenter.segment(str)) {
      if (count >= maxGraphemes) break;
      result += segment.segment;
      count++;
    }
    return result;
  }
}
