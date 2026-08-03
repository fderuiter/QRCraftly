import React from 'react';
import { mergeClasses, FIELDSET_CLASSES, LEGEND_CLASSES, SUB_FIELDSET_CLASSES, SUB_LEGEND_CLASSES } from './styles';

/**
 * Properties for the FormBlock layout component.
 */
export interface FormBlockProps {
  /**
   * The content to render inside the form block.
   */
  children: React.ReactNode;
  /**
   * Additional className to apply to the fieldset wrapper.
   */
  className?: string;
  /**
   * The text for the optional legend element.
   */
  legend?: string;
  /**
   * Additional className for the legend element.
   */
  legendClassName?: string;
  /**
   * If true, style as a sub-fieldset. Uses SUB_FIELDSET_CLASSES and SUB_LEGEND_CLASSES.
   */
  isSubFieldset?: boolean;
}

/**
 * A reusable, strictly presentational FormBlock layout component.
 * Unifies standard field spacing and labeling for inputs.
 * @param root0 The properties object.
 * @param root0.children The content to render inside the form block.
 * @param root0.className Additional className to apply to the fieldset wrapper.
 * @param root0.legend The text for the optional legend element.
 * @param root0.legendClassName Additional className for the legend element.
 * @param root0.isSubFieldset If true, style as a sub-fieldset.
 * @returns The rendered FormBlock component wrapper.
 */
export const FormBlock: React.FC<FormBlockProps> = ({
  children,
  className = '',
  legend,
  legendClassName = '',
  isSubFieldset = false,
}) => {
  const defaultFieldsetClasses = isSubFieldset ? SUB_FIELDSET_CLASSES : FIELDSET_CLASSES;
  const defaultLegendClasses = isSubFieldset ? SUB_LEGEND_CLASSES : LEGEND_CLASSES;

  const wrapperClasses = mergeClasses(defaultFieldsetClasses, className);
  const finalLegendClasses = mergeClasses(defaultLegendClasses, legendClassName);

  return (
    <fieldset className={wrapperClasses}>
      {legend && <legend className={finalLegendClasses}>{legend}</legend>}
      {children}
    </fieldset>
  );
};
