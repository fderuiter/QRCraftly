/*
    QRCraftly
    Copyright (C) 2026 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React, { useRef } from 'react';
import { Button } from '@/components/ui/Button';

/** One choice. */
interface Choice<T extends string> {
  /** Value. */
  id: T;
  /** Visible content. */
  label: React.ReactNode;
  /** Accessible name when the visible content is not a good name. */
  ariaLabel?: string;
}

/** Properties for {@link ChoiceGroup}. */
interface ChoiceGroupProps<T extends string> {
  /** `radiogroup` for settings, `tablist` for the mode switcher. */
  kind: 'radiogroup' | 'tablist';
  /** Accessible group name. */
  label: string;
  /** Choices in order. */
  choices: readonly Choice<T>[];
  /** Selected value. */
  value: T;
  /** Called with the newly selected value. */
  onChange: (value: T) => void;
  /** Group layout classes. */
  className?: string;
  /** Classes for every choice button. */
  itemClassName?: string;
  /** Button size. */
  size?: 'sm' | 'md';
  /** For tabs: id of the element each tab controls. */
  controls?: (value: T) => string;
  /** For tabs: id given to each tab so its panel can reference it. */
  tabId?: (value: T) => string;
}

/**
 * Single-select group of catalog `Button`s with the WAI-ARIA radio group or tab list
 * keyboard model: one tab stop (roving tabindex), arrow keys, Home and End move and select.
 * Selection is shown with the Button `pressed` style; `aria-checked` / `aria-selected`
 * carry the state (`aria-pressed` is not valid on radios or tabs, so it is omitted).
 * @param props - Group properties.
 * @returns The group.
 */
export function ChoiceGroup<T extends string>({
  kind,
  label,
  choices,
  value,
  onChange,
  className = '',
  itemClassName = '',
  size = 'sm',
  controls,
  tabId,
}: ChoiceGroupProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const isTabs = kind === 'tablist';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % choices.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + choices.length) % choices.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = choices.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const choice = choices[next];
    onChange(choice.id);
    refs.current[next]?.focus();
  };

  return (
    <div role={kind} aria-label={label} className={className}>
      {choices.map((choice, index) => {
        const selected = choice.id === value;
        return (
          <Button
            key={choice.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role={isTabs ? 'tab' : 'radio'}
            id={tabId?.(choice.id)}
            aria-checked={isTabs ? undefined : selected}
            aria-selected={isTabs ? selected : undefined}
            aria-controls={controls?.(choice.id)}
            aria-label={choice.ariaLabel}
            pressed={selected}
            aria-pressed={undefined}
            tabIndex={selected ? 0 : -1}
            variant="outline"
            size={size}
            className={itemClassName}
            onClick={() => onChange(choice.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {choice.label}
          </Button>
        );
      })}
    </div>
  );
}
