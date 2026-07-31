import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from './Button';

/**
 *
 */
type ToastType = 'success' | 'error' | 'info';

/**
 *
 */
interface ToastMessage {
  /**
   *
   */
  id: string;
  /**
   *
   */
  type: ToastType;
  /**
   *
   */
  message: string;
  /**
   *
   */
  duration?: number;
}

/**
 *
 */
interface ToastContextType {
  /**
   *
   */
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  /**
   *
   */
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 *
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 *
 * @param root0
 * @param root0.children
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
      <div className="bottom-4 fixed flex flex-col gap-2 items-center left-4 md:items-end md:left-auto md:right-4 pointer-events-none right-4 z-50">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info;
  
  let colors = '';
  if (toast.type === 'success') {
    colors = 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200';
  } else if (toast.type === 'error') {
    colors = 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200';
  } else {
    colors = 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
  }

  return (
    <div 
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`border duration-300 ease-in-out flex gap-3 items-center max-w-md opacity-100 p-4 pointer-events-auto rounded-xl shadow-lg transform transition-all translate-y-0 w-full ${colors}`}
    >
      <Icon className="flex-shrink-0 h-5 w-5" />
      <p className="flex-1 font-medium text-sm">{toast.message}</p>
      <Button
        variant="ghost"
        size="icon" 
        onClick={() => onRemove(toast.id)}
        className="dark:hover:bg-white/10 hover:bg-black/5 p-1 rounded-lg"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
