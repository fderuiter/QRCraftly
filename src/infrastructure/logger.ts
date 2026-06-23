/**
 * Centralized logging service for the application.
 * Formats logs consistently and ensures sensitive data is not exposed.
 */

type LogLevel = 'info' | 'warn' | 'error';

class Logger {
  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    
    const safeData = this.sanitize(data);

    if (level === 'error') {
      console.error(`[${timestamp}] ERROR: ${message}`, safeData !== undefined ? safeData : '');
    } else if (level === 'warn') {
      console.warn(`[${timestamp}] WARN: ${message}`, safeData !== undefined ? safeData : '');
    } else {
      console.info(`[${timestamp}] INFO: ${message}`, safeData !== undefined ? safeData : '');
    }
  }

  private sanitize(data: unknown): unknown {
    if (data === undefined) return undefined;
    
    if (data instanceof Error) {
      return { message: data.message, stack: data.stack, name: data.name };
    }
    
    if (typeof data === 'object' && data !== null) {
      try {
        const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
          const sensitiveKeys = ['password', 'token', 'secret', 'file', 'content', 'dataurl'];
          if (sensitiveKeys.includes(key.toLowerCase())) return '[REDACTED]';
          // Truncate long strings to avoid logging file contents/base64
          if (typeof value === 'string' && value.length > 200) {
            return value.substring(0, 200) + '...[TRUNCATED]';
          }
          return value;
        }));
        return sanitized;
      } catch {
        return '[Unserializable]';
      }
    }
    return data;
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown) {
    this.log('error', message, error);
  }
}

export const logger = new Logger();
