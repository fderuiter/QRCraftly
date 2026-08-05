import { useId } from 'react';
import { combineIds } from '../utils/a11y';

/**
 * Properties for the useFieldIds hook.
 */
interface UseFieldIdsProps {
  /**
   * Optional custom field identifier.
   */
  id?: string;
  /**
   * Optional field error message.
   */
  error?: string;
  /**
   * Optional boolean to toggle character count display.
   */
  showCharCount?: boolean;
  /**
   * Optional maximum characters allowed in the field.
   */
  maxLength?: number;
  /**
   * Optional additional aria-describedby identifiers.
   */
  ariaDescribedby?: string;
}

/**
 * Hook to standardize ARIA identifier generation and screen-reader mappings across inputs.
 * @param root0 The hook properties.
 * @param root0.id Optional custom identifier.
 * @param root0.error Optional error message.
 * @param root0.showCharCount Boolean flag to display character count.
 * @param root0.maxLength Maximum allowed characters.
 * @param root0.ariaDescribedby Extra described by mapping.
 * @returns An object containing mapped IDs and aria-describedby.
 */
export function useFieldIds({ id, error, showCharCount, maxLength, ariaDescribedby }: UseFieldIdsProps) {
  const defaultId = useId();
  const inputId = id || defaultId;
  const errorId = error ? `${inputId}-error` : undefined;
  const charCountId = (showCharCount && maxLength) ? `${inputId}-char-count` : undefined;
  const describedBy = combineIds(errorId, charCountId, ariaDescribedby);

  return { inputId, errorId, charCountId, describedBy };
}
