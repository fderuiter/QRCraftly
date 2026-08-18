/**
 *
 */
export const BASE_INPUT_CLASSES = "bg-white border border-slate-600 dark:bg-slate-900 dark:border-slate-400 dark:text-slate-100 rounded-lg text-slate-700 text-sm transition-all w-full placeholder-slate-600 dark:placeholder-slate-400";

/**
 * Unified Layout Spacing & Structure Variables
 */
export const FIELDSET_CLASSES = "space-y-4 min-w-0";
/**
 *
 */
export const LEGEND_CLASSES = "text-sm font-semibold text-slate-700 dark:text-slate-200 w-full mb-3";
/**
 *
 */
export const CONTAINER_SPACING_CLASSES = "space-y-3";
/**
 *
 */
export const GRID_TWO_COLUMNS_CLASSES = "grid grid-cols-2 gap-4";
/**
 *
 */
export const SUB_FIELDSET_CLASSES = "pt-2 border-t border-slate-100 dark:border-slate-800 min-w-0";
/**
 *
 */
export const SUB_LEGEND_CLASSES = "block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 w-full";
/**
 *
 */
export const SUB_CONTAINER_SPACING_CLASSES = "space-y-4";

/**
 *
 */
export const TEXT_FIELD_CLASSES = `${BASE_INPUT_CLASSES} px-3 py-2`;
/**
 *
 */
export const TEXT_AREA_CLASSES = `${BASE_INPUT_CLASSES} font-sans px-4 py-2`;
/**
 *
 */
export const SELECT_CLASSES = `${BASE_INPUT_CLASSES} font-mono px-3 py-2`;
/**
 *
 */
export const ERROR_INPUT_CLASSES = "border-rose-500 dark:border-rose-500";

/**
 * Merges Tailwind classes and resolves overrides.
 * Last-one-wins for conflicting classes within the same prefix category/modifier.
 * @param inputs The input classes to merge.
 * @returns The merged and resolved class string.
 */
export function mergeClasses(...inputs: (string | undefined | null | false)[]): string {
  const resolved: Record<string, string> = {};

  for (const input of inputs) {
    if (!input) continue;
    const classes = input.trim().split(/\s+/);

    for (const cls of classes) {
      if (!cls) continue;

      // Extract modifiers (e.g. "dark:hover:")
      const parts = cls.split(':');
      const baseClass = parts[parts.length - 1];
      const modifiers = parts.slice(0, parts.length - 1).join(':') + (parts.length > 1 ? ':' : '');

      let group: string | null = null;

      if (baseClass.startsWith('px-')) {
        group = 'px';
      } else if (baseClass.startsWith('py-')) {
        group = 'py';
      } else if (baseClass.startsWith('pl-')) {
        group = 'pl';
      } else if (baseClass.startsWith('pr-')) {
        group = 'pr';
      } else if (baseClass.startsWith('pt-')) {
        group = 'pt';
      } else if (baseClass.startsWith('pb-')) {
        group = 'pb';
      } else if (baseClass.startsWith('p-')) {
        group = 'p';
      } else if (baseClass.startsWith('mx-')) {
        group = 'mx';
      } else if (baseClass.startsWith('my-')) {
        group = 'my';
      } else if (baseClass.startsWith('ml-')) {
        group = 'ml';
      } else if (baseClass.startsWith('mr-')) {
        group = 'mr';
      } else if (baseClass.startsWith('mt-')) {
        group = 'mt';
      } else if (baseClass.startsWith('mb-')) {
        group = 'mb';
      } else if (baseClass.startsWith('m-')) {
        group = 'm';
      } else if (baseClass.startsWith('bg-')) {
        group = 'bg';
      } else if (baseClass.startsWith('text-')) {
        group = 'text';
      } else if (baseClass.startsWith('font-')) {
        group = 'font';
      } else if (baseClass.startsWith('rounded-') || baseClass === 'rounded') {
        group = 'rounded';
      } else if (baseClass.startsWith('placeholder-')) {
        group = 'placeholder';
      } else if (baseClass.startsWith('w-')) {
        group = 'w';
      } else if (baseClass.startsWith('h-')) {
        group = 'h';
      } else if (baseClass.startsWith('transition-') || baseClass === 'transition') {
        group = 'transition';
      } else if (baseClass.startsWith('border-') || baseClass === 'border') {
        // Distinguish border-color vs border-width
        const isColor = /^border-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|current|inherit)(-\d+)?(\/\d+)?$/.test(baseClass);
        if (isColor) {
          group = 'border-color';
        } else {
          if (baseClass.startsWith('border-t')) group = 'border-t';
          else if (baseClass.startsWith('border-b')) group = 'border-b';
          else if (baseClass.startsWith('border-l')) group = 'border-l';
          else if (baseClass.startsWith('border-r')) group = 'border-r';
          else group = 'border-width';
        }
      }

      if (group) {
        const key = `${modifiers}${group}`;
        resolved[key] = cls;
      } else {
        resolved[`raw:${cls}`] = cls;
      }
    }
  }

  return Object.values(resolved).join(' ');
}
