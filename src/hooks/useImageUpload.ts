/*
    QRCraftly
    Copyright (C) 2025 fderuiter

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

import { useState, useCallback } from 'react';
import { validateImageUpload, sanitizeSvg } from '../utils/security';

/**
 *
 */
interface UseImageUploadReturn {
  /**
   *
   */
  error: string | null;
  /**
   *
   */
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>, onSuccess: (dataUrl: string) => void) => void;
  /**
   *
   */
  setError: (error: string | null) => void;
}

/**
 * Hook to handle image uploading and validation.
 * Used for logo and border logo uploads to keep components DRY.
 */
export function useImageUpload(): UseImageUploadReturn {
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, onSuccess: (dataUrl: string) => void) => {
    const file = e.target.files?.[0];
    setError(null);
    if (file) {
      const validationError = validateImageUpload(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const rawSvg = event.target?.result as string;
          const sanitizedSvg = sanitizeSvg(rawSvg);
          const base64 = btoa(unescape(encodeURIComponent(sanitizedSvg)));
          const dataUrl = `data:image/svg+xml;base64,${base64}`;
          onSuccess(dataUrl);
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          onSuccess(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  return { error, handleUpload, setError };
}
