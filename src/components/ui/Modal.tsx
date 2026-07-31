import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 *
 */
interface ModalProps {
  /**
   *
   */
  isOpen: boolean;
  /**
   *
   */
  onClose: () => void;
  /**
   *
   */
  title: string;
  /**
   *
   */
  children: React.ReactNode;
}

/**
 *
 * @param root0
 * @param root0.isOpen
 * @param root0.onClose
 * @param root0.title
 * @param root0.children
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useScrollLock(isOpen);
  useFocusTrap(containerRef, isOpen);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="bg-black/50 fixed flex inset-0 items-center justify-center p-4 transition-opacity z-50" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
    >
      <div className="bg-white dark:bg-slate-900 flex flex-col max-h-[90vh] max-w-md overflow-hidden rounded-xl shadow-2xl w-full">
        <div className="border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 py-4">
          <h2 id="modal-title" className="dark:text-slate-100 font-semibold text-lg text-slate-800">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal" className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
