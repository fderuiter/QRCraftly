import { logger } from './logger';
import { dispatchToast } from '../components/ui/Toast';

class SafeStorage {
  private memoryFallback = new Map<string, string>();
  private useFallback = false;

  constructor() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.useFallback = true;
      } else {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
      }
    } catch (e) {
      this.useFallback = true;
      logger.warn('localStorage is unavailable or restricted. Using memory fallback.', e);
    }
  }

  getItem(key: string): string | null {
    if (this.useFallback) {
      return this.memoryFallback.get(key) ?? null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      logger.error(`Failed to read from localStorage for key: ${key}`, e);
      return this.memoryFallback.get(key) ?? null;
    }
  }

  setItem(key: string, value: string): void {
    if (this.useFallback) {
      this.memoryFallback.set(key, value);
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (e: any) {
      logger.error(`Failed to write to localStorage for key: ${key}`, e);
      
      const isQuotaExceeded = e instanceof DOMException && (
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 || 
        e.code === 1014
      );
                              
      if (isQuotaExceeded) {
         logger.warn('Storage quota exceeded, switching to memory fallback for future operations');
         this.useFallback = true;
         this.memoryFallback.set(key, value);
         dispatchToast({
           type: 'info',
           message: 'Device storage is full or restricted. Switched to temporary memory storage.',
           duration: 6000
         });
      }
    }
  }

  removeItem(key: string): void {
    if (this.useFallback) {
      this.memoryFallback.delete(key);
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      logger.error(`Failed to remove from localStorage for key: ${key}`, e);
      this.memoryFallback.delete(key);
    }
  }

  clear(): void {
    if (this.useFallback) {
      this.memoryFallback.clear();
      return;
    }
    try {
      window.localStorage.clear();
    } catch (e) {
      logger.error('Failed to clear localStorage', e);
      this.memoryFallback.clear();
    }
  }
}

export const safeStorage = new SafeStorage();
