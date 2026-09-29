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

import React from 'react';
import { navigate } from 'vike/client/router';
import { Button } from '@/components/ui/Button';
import { useQRStore } from '@/context/QRContext';
import { stageArcadeTarget } from '@/packages/arcade/handoff';
import { targetFromConfig } from './target';

/**
 * "Stress Test in Arcade" call to action for the generator preview. It stages the current
 * design in memory (never in the URL, storage or network) and navigates client-side to
 * /arcade, where the design becomes the arcade target.
 * @returns The button.
 */
export function StressTestButton() {
  const store = useQRStore();
  return (
    <Button
      variant="outline"
      size="sm"
      fullWidth
      className="mb-4"
      onClick={() => {
        stageArcadeTarget(targetFromConfig(store.getState().config));
        Promise.resolve(navigate('/arcade')).catch(() => {
          window.location.assign('/arcade');
        });
      }}
    >
      Stress Test in Arcade
    </Button>
  );
}
