import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { usePresence } from '../../hooks/usePresence';

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
  /**
   * `md` (default) is a compact dialog. `lg` fills the screen on phones and is a large dialog
   * on wider screens, for content such as a camera viewfinder.
   */
  size?: 'md' | 'lg';
  /**
   * Accessible name of the close button.
   */
  closeLabel?: string;
}

const SIZE_CLASSES = {
  md: { backdrop: 'p-4', panel: 'max-h-[90vh] max-w-md rounded-xl', body: 'p-6' },
  lg: {
    backdrop: 'p-0 sm:p-4',
    panel: 'h-full max-h-none max-w-3xl sm:h-auto sm:max-h-[95vh] sm:rounded-xl',
    body: 'p-0 sm:p-4',
  },
} as const;

/**
 * Modal component that renders a modal dialog with an optional backdrop dismissal.
 * @param root0 The props for the modal component.
 * @param root0.isOpen Whether the modal is open.
 * @param root0.onClose Callback function to close the modal.
 * @param root0.title The title of the modal.
 * @param root0.children The content of the modal.
 * @param root0.dismissOnBackdropClick Whether clicking on the backdrop should close the modal.
 * @param root0.size Compact (`md`) or large (`lg`, full screen on phones).
 * @param root0.closeLabel Accessible name of the close button.
 * @returns The rendered modal element or null.
 */
export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  dismissOnBackdropClick = false,
  size = 'md',
  closeLabel = 'Close modal',
}) => {
  const sizeClasses = SIZE_CLASSES[size];
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  // Unique per instance so two dialogs never share a labelling id.
  const titleId = `modal-title-${useId()}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stays mounted briefly after closing so the exit animation can play (instant under reduced motion).
  const { mounted: present, closing } = usePresence(isOpen);

  useScrollLock(isOpen);
  useFocusTrap(containerRef, isOpen && mounted);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Sibling elements of the active modal must dynamically receive aria-hidden="true" when open
  useEffect(() => {
    if (!isOpen || !mounted) return;

    const modalElement = containerRef.current;
    if (!modalElement) return;

    const originalStates = new Map<Element, string | null>();
    const siblings = Array.from(document.body.children).filter(
      (child) => child !== modalElement && !['SCRIPT', 'STYLE', 'LINK'].includes(child.tagName)
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

  if (!present) return null;
  if (!mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dismissOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-scrim ${sizeClasses.backdrop} data-closed:pointer-events-none motion-safe:animate-fade-in motion-safe:data-closed:animate-fade-out`}
      role="presentation"
      data-closed={closing || undefined}
      inert={closing || undefined}
      onClick={handleBackdropClick}
    >
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby={titleId}
        className={`flex w-full flex-col overflow-hidden bg-surface shadow-modal motion-safe:animate-pop-in motion-safe:in-data-closed:animate-pop-out ${sizeClasses.panel}`}
      >
        <div className="flex items-center justify-between border-b border-line-subtle px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-fg">{title}</h2>
          <Button variant="ghost" iconOnly size="sm" onClick={onClose} aria-label={closeLabel} className="shrink-0">
            <X className="size-5" />
          </Button>
        </div>
        <div className={`overflow-y-auto ${sizeClasses.body}`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
