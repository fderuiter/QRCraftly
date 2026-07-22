import { describe, it, expect } from 'vitest';
import { contentRegistry } from './contentRegistry';
import { ValidationEngine } from '../engine/ValidationEngine';

describe('Content Registry Validation', () => {
  const STRICT_NO_CONTROL = ValidationEngine.CONTAINMENT_PROFILES.STRICT_NO_CONTROL;

  it('should conform to ToolContent schema and have no control characters', () => {
    Object.entries(contentRegistry).forEach(([key, tool]) => {
      // 1. Structure validation
      expect(tool.id, `File src/data/contentRegistry.ts - Tool '${key}': Missing or invalid 'id'`).toBeTypeOf('string');
      expect(tool.name, `File src/data/contentRegistry.ts - Tool '${key}': Missing or invalid 'name'`).toBeTypeOf('string');
      expect(tool.url, `File src/data/contentRegistry.ts - Tool '${key}': Missing or invalid 'url'`).toBeTypeOf('string');
      expect(tool.description, `File src/data/contentRegistry.ts - Tool '${key}': Missing or invalid 'description'`).toBeTypeOf('string');
      expect(Array.isArray(tool.features), `File src/data/contentRegistry.ts - Tool '${key}': 'features' must be an array`).toBe(true);
      expect(Array.isArray(tool.faqs), `File src/data/contentRegistry.ts - Tool '${key}': 'faqs' must be an array`).toBe(true);

      if (tool.howTo) {
        expect(tool.howTo.name, `File src/data/contentRegistry.ts - Tool '${key}': 'howTo.name' missing or invalid`).toBeTypeOf('string');
        expect(tool.howTo.description, `File src/data/contentRegistry.ts - Tool '${key}': 'howTo.description' missing or invalid`).toBeTypeOf('string');
        expect(Array.isArray(tool.howTo.steps), `File src/data/contentRegistry.ts - Tool '${key}': 'howTo.steps' must be an array`).toBe(true);
        if (tool.howTo.supply) {
          expect(Array.isArray(tool.howTo.supply), `File src/data/contentRegistry.ts - Tool '${key}': 'howTo.supply' must be an array`).toBe(true);
        }
      }

      // 2. Character validation against all strings
      const checkString = (str: string, path: string) => {
        if (typeof str !== 'string') return;
        const match = str.match(STRICT_NO_CONTROL);
        if (match) {
          const charCode = match[0].charCodeAt(0).toString(16).toUpperCase();
          throw new Error(`File src/data/contentRegistry.ts - Tool '${tool.id}', Path '${path}': Contains invalid control or zero-width character (\\u${charCode.padStart(4, '0')}) in rule STRICT_NO_CONTROL`);
        }
      };

      checkString(tool.id, 'id');
      checkString(tool.name, 'name');
      checkString(tool.url, 'url');
      checkString(tool.description, 'description');

      tool.features.forEach((feature, index) => {
        checkString(feature, `features[${index}]`);
      });

      if (tool.howTo) {
        checkString(tool.howTo.name, 'howTo.name');
        checkString(tool.howTo.description, 'howTo.description');
        if (tool.howTo.supply) {
          tool.howTo.supply.forEach((item, index) => {
            checkString(item.name, `howTo.supply[${index}].name`);
          });
        }
        tool.howTo.steps.forEach((step, index) => {
          checkString(step.name, `howTo.steps[${index}].name`);
          checkString(step.text, `howTo.steps[${index}].text`);
        });
      }

      tool.faqs.forEach((faq, index) => {
        expect(faq.question, `File src/data/contentRegistry.ts - Tool '${key}': 'faqs[${index}].question' missing or invalid`).toBeTypeOf('string');
        expect(faq.answer, `File src/data/contentRegistry.ts - Tool '${key}': 'faqs[${index}].answer' missing or invalid`).toBeTypeOf('string');
        checkString(faq.question, `faqs[${index}].question`);
        checkString(faq.answer, `faqs[${index}].answer`);
      });
    });
  });
});
