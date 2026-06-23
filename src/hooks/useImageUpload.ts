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
import { validateImageUpload } from '../utils/security';
import { safeReadFileAsDataURL } from '../infrastructure/fileReader';

interface UseImageUploadReturn {
  error: string | null;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>, onSuccess: (dataUrl: string) => void) => void;
  setError: (error: string | null) => void;
}

/**
 * Hook to handle image uploading and validation.
 * Used for logo and border logo uploads to keep components DRY.
 */
export function useImageUpload(): UseImageUploadReturn {
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, onSuccess: (dataUrl: string) => void) => {
    const file = e.target.files?.[0];
    setError(null);
    if (file) {
      const validationError = validateImageUpload(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      try {
        const dataUrl = await safeReadFileAsDataURL(file);
        onSuccess(dataUrl);
      } catch (err) {
        // Error is logged and toast is dispatched in the safe wrapper
        setError('Failed to read file. Please try another image.');
      }
    }
  }, []);

  return { error, handleUpload, setError };
}
