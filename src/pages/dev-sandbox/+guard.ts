import { render } from 'vike/abort';

/**
 *
 */
export const guard = () => {
  if (import.meta.env.PROD) {
    throw render(404, 'Developer sandbox is only available in development mode.');
  }
};
