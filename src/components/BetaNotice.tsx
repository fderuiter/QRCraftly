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

import { useState } from 'react';
import { Alert } from './ui/Alert';

/**
 * Whether the file-transfer beta notice was dismissed. Held in memory only (no storage
 * key), so it stays dismissed across the send and receive pages until the tab reloads.
 */
let dismissedThisSession = false;

/**
 * The one beta notice of the file-transfer tool, shown once per session: dismissing it on
 * the send or receive page hides it on both until the page is reloaded.
 * @returns The notice, or nothing once dismissed.
 */
export function BetaNotice() {
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  if (dismissed) return null;
  return (
    <Alert
      variant="info"
      role="note"
      onDismiss={() => {
        dismissedThisSession = true;
        setDismissed(true);
      }}
    >
      <span className="font-semibold">Beta:</span> transfers work best in even light, without glare, with both devices
      held steady.
    </Alert>
  );
}
