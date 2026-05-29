import { contentRegistry } from './contentRegistry';
import { generateSchema } from '../utils/schemaGenerator';

export const toolMetadata = Object.keys(contentRegistry).reduce(
  (acc, key) => {
    acc[key] = generateSchema(contentRegistry[key]);
    return acc;
  },
  {} as Record<string, Record<string, unknown>>,
);
