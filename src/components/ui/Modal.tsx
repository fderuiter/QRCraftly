import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);
  useFocusTrap(containerRef, isOpen && mounted);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Sibling elements of the active modal must dynamically receive aria-hidden="true" when open,
  // excluding live region announcers and toast containers so screen readers receive notifications.
  useEffect(() => {
    if (!isOpen || !mounted) return;

    const modalElement = containerRef.current;
    if (!modalElement) return;

    const originalStates = new Map<Element, string | null>();

    const isLiveOrNotification = (el: Element): boolean => {
      if (el.id === 'dynamic-focus-live-region' || el.id === 'dynamic-focus-live-region-assertive') return true;
      if (el.getAttribute('data-toast-container') === 'true') return true;
      if (el.getAttribute('aria-live') || el.getAttribute('role') === 'status' || el.getAttribute('role') === 'alert') return true;
      return false;
    };

    const siblings = Array.from(document.body.children).filter(
      (child) => child !== modalElement && !['SCRIPT', 'STYLE', 'LINK'].includes(child.tagName) && !isLiveOrNotification(child)
    );

    siblings.forEach((sibling) => {
      originalStates.set(sibling, sibling.getAttribute('aria-hidden'));
      sibling.setAttribute('aria-hidden', 'true');
    });

    return () => {
      siblings.forEach((sibling) => {
        const originalVal = originalStates.get(sibling);
        if (originalVal === null || originalVal === undefined) {
          sibling.removeAttribute('aria-hidden');
        } else {
          sibling.setAttribute('aria-hidden', originalVal);
        }
      });
    };
  }, [isOpen, mounted]);

  if (!isOpen) return null;
  if (!mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dismissOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
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
    </div>,
    document.body
  );
};
