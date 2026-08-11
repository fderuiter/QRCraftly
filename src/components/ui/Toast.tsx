import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { getNotificationColors, getNotificationIcon } from '../../utils/notificationStyles';
import { mergeClasses } from './styles';

/**
 * Type of the toast notification message.
 */
type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * A message structure inside the toast state.
 */
interface ToastMessage {
  /**
   * Unique message identifier.
   */
  id: string;
  /**
   * Style and icon state variant.
   */
  type: ToastType;
  /**
   * The text message to display.
   */
  message: string;
  /**
   * Time in ms before automatically closing.
   */
  duration?: number;
}

/**
 * Properties offered by the Toast context.
 */
interface ToastContextType {
  /**
   * Adds a new toast message.
   */
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  /**
   * Removes an existing toast message.
   */
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Context hook for components to trigger toast alerts.
 * @returns Toast context interface.
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return safe fallback for unit tests running outside ToastProvider
    return {
      addToast: () => {},
      removeToast: () => {},
    };
  }
  return context;
};

/**
 * Context Provider wrapping the app to offer accessible status toasts.
 * @param root0 The provider properties.
 * @param root0.children Child elements.
 * @returns React Context Provider element.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 md:right-4 md:left-auto md:items-end">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Single accessible notification banner.
 * @param props Component properties.
 * @param props.toast The toast message object to render.
 * @param props.onRemove Callback to dismiss the toast.
 * @returns React functional component rendering a single toast.
 */
const ToastItem = (props: { toast: ToastMessage; onRemove: (id: string) => void }) => {
  const { toast, onRemove } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isHovered || isFocused) {
      return;
    }

    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast, onRemove, isHovered, isFocused]);

  const colors = getNotificationColors(toast.type, false);

  return (
    <div 
      role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      className={mergeClasses("pointer-events-auto flex w-full max-w-md translate-y-0 transform items-center gap-3 rounded-xl border p-4 opacity-100 shadow-lg transition-all duration-300 ease-in-out", colors)}
    >
      {React.createElement(getNotificationIcon(toast.type), { className: "size-5 flex-shrink-0" })}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <Button
        variant="ghost"
        size="icon" 
        onClick={() => onRemove(toast.id)}
        className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Close notification"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};
