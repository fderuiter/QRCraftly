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
   * Whether the modal is open.
   */
  isOpen: boolean;
  /**
   * Callback function to close the modal.
   */
  onClose: () => void;
  /**
   * The title of the modal.
   */
  title: string;
  /**
   * The content of the modal.
   */
  children: React.ReactNode;
  /**
   * Whether clicking on the backdrop should close the modal.
   */
  dismissOnBackdropClick?: boolean;
}

/**
 * Modal component that renders a modal dialog with an optional backdrop dismissal.
 * @param root0 The props for the modal component.
 * @param root0.isOpen Whether the modal is open.
 * @param root0.onClose Callback function to close the modal.
 * @param root0.title The title of the modal.
 * @param root0.children The content of the modal.
 * @param root0.dismissOnBackdropClick Whether clicking on the backdrop should close the modal.
 * @returns The rendered modal element or null.
 */
export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  dismissOnBackdropClick = false
}) => {
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dismissOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity" 
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal" className="shrink-0">
            <X className="size-5" />
          </Button>
        </div>
        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
