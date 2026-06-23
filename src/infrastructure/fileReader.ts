import { logger } from './logger';
import { dispatchToast } from '../components/ui/Toast';

/**
 * Standardized asynchronous file reader utility.
 * Enforces error handling, logging, and rejection logic for file operations.
 */
export async function safeReadFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target && event.target.result) {
          resolve(event.target.result as string);
        } else {
          const errorMsg = 'File reading resulted in an empty result.';
          logger.error(errorMsg);
          reject(new Error(errorMsg));
        }
      };

      reader.onerror = () => {
        const error = reader.error || new Error('Unknown FileReader error');
        logger.error(`Failed to read file: ${file.name}`, error);
        
        dispatchToast({
          type: 'error',
          message: `Unable to read file "${file.name}". It may be corrupted or unavailable.`,
          duration: 5000
        });
        
        reject(error);
      };

      reader.onabort = () => {
        const msg = `File reading aborted for: ${file.name}`;
        logger.warn(msg);
        reject(new Error(msg));
      };

      reader.readAsDataURL(file);
    } catch (error) {
      logger.error('Exception thrown while initializing FileReader', error);
      dispatchToast({
        type: 'error',
        message: 'A critical error occurred while trying to process the file.',
        duration: 5000
      });
      reject(error);
    }
  });
}
