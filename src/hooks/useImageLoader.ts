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

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ImageDimensions,
  DimensionBounds,
  createTrackedObjectURL,
  revokeTrackedObjectURL,
  calculateAspectBounds
} from '../utils/imageLoaderUtils';
import { setCachedAsset, convertImageToBase64 } from '../utils/assetCache';

/**
 * Loading status union for image asset processing.
 */
export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Configuration options for the useImageLoader hook.
 */
export interface UseImageLoaderOptions {
  /** Optional target bounding box or max dimension constraint. */
  maxDim?: number | DimensionBounds;
  /** Optional crossOrigin setting for CORS images. */
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  /** Whether to automatically load on source changes. Defaults to true. */
  autoLoad?: boolean;
}

/**
 * Return state and actions interface for the useImageLoader hook.
 */
export interface UseImageLoaderReturn {
  /** The loaded HTMLImageElement or null. */
  image: HTMLImageElement | null;
  /** Current loading state feedback. */
  status: ImageLoadingStatus;
  /** Uniform error feedback string or null. */
  error: string | null;
  /** Exact natural dimensions probed from the asset or null. */
  dimensions: ImageDimensions | null;
  /** Calculated bounds fitting optional maxDim bounds or null. */
  bounds: ImageDimensions | null;
  /** Function to imperatively load an image source. */
  load: (src?: string | File | Blob | null) => Promise<HTMLImageElement | null>;
  /** Function to reset state and synchronously revoke temporary object URLs. */
  reset: () => void;
}

/**
 * Centralized hook for UI components to initiate image loading, probe exact dimensions,
 * track loading states, and automatically manage memory lifecycle and Object URL revocation.
 * @param source - Initial image source string (URL/Data URL), File, or Blob.
 * @param options - Configuration options for CORS, downscaling bounds, and autoloading.
 * @returns State and imperative control methods.
 */
export function useImageLoader(
  source?: string | File | Blob | null,
  options: UseImageLoaderOptions = {}
): UseImageLoaderReturn {
  const { maxDim, crossOrigin = 'anonymous', autoLoad = true } = options;

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<ImageLoadingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [bounds, setBounds] = useState<ImageDimensions | null>(null);

  const activeObjectUrlRef = useRef<string | null>(null);
  const activeImageRef = useRef<HTMLImageElement | null>(null);

  /**
   * Synchronously revokes active Object URL and resets all hook state.
   */
  const reset = useCallback(() => {
    if (activeImageRef.current) {
      activeImageRef.current.onload = null;
      activeImageRef.current.onerror = null;
      activeImageRef.current = null;
    }

    if (activeObjectUrlRef.current) {
      revokeTrackedObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }

    setImage(null);
    setStatus('idle');
    setError(null);
    setDimensions(null);
    setBounds(null);
  }, []);

  /**
   * Loads an image asset asynchronously, probes dimensions, and updates state.
   */
  const load = useCallback(
    async (src?: string | File | Blob | null): Promise<HTMLImageElement | null> => {
      const targetSrc = src !== undefined ? src : source;

      if (!targetSrc) {
        reset();
        return null;
      }

      // Cleanup prior pending image or object URL
      if (activeImageRef.current) {
        activeImageRef.current.onload = null;
        activeImageRef.current.onerror = null;
        activeImageRef.current = null;
      }
      if (activeObjectUrlRef.current) {
        revokeTrackedObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }

      setStatus('loading');
      setError(null);

      let imgUrl = '';
      if (typeof Blob !== 'undefined' && targetSrc instanceof Blob) {
        const objectUrl = createTrackedObjectURL(targetSrc);
        activeObjectUrlRef.current = objectUrl;
        imgUrl = objectUrl;
      } else if (typeof targetSrc === 'string') {
        imgUrl = targetSrc;
      }

      if (!imgUrl) {
        setStatus('error');
        setError('Invalid image source type');
        return null;
      }

      return new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        activeImageRef.current = img;

        if (crossOrigin && typeof targetSrc === 'string' && !targetSrc.startsWith('data:')) {
          img.crossOrigin = crossOrigin;
        }

        const handleSuccess = (loadedImg: HTMLImageElement) => {
          if (activeImageRef.current !== loadedImg) return;

          const width = loadedImg.naturalWidth || loadedImg.width || 0;
          const height = loadedImg.naturalHeight || loadedImg.height || 0;
          const aspectRatio = height > 0 ? width / height : 1;

          const computedDims: ImageDimensions = { width, height, aspectRatio };
          const computedBounds = maxDim ? calculateAspectBounds(width, height, maxDim) : computedDims;

          setDimensions(computedDims);
          setBounds(computedBounds);
          setImage(loadedImg);
          setStatus('loaded');
          setError(null);

          // Asset cache integration
          if (typeof targetSrc === 'string') {
            if (targetSrc.startsWith('data:')) {
              setCachedAsset(targetSrc, targetSrc);
            } else {
              const base64 = convertImageToBase64(loadedImg);
              if (base64) {
                setCachedAsset(targetSrc, base64);
              }
            }
          }

          resolve(loadedImg);
        };

        const handleFailure = (errMessage: string) => {
          if (activeImageRef.current !== img) return;

          setImage(null);
          setDimensions(null);
          setBounds(null);
          setStatus('error');
          setError(errMessage);

          if (activeObjectUrlRef.current) {
            revokeTrackedObjectURL(activeObjectUrlRef.current);
            activeObjectUrlRef.current = null;
          }

          resolve(null);
        };

        img.onload = () => handleSuccess(img);
        img.onerror = () => handleFailure('Failed to load image asset');

        // Check if image is already cached/complete
        if (img.complete && img.naturalHeight !== 0) {
          handleSuccess(img);
          return;
        }

        img.src = imgUrl;
      });
    },
    [source, maxDim, crossOrigin, reset]
  );

  // Auto-load on source prop change
  useEffect(() => {
    if (autoLoad && source !== undefined) {
      load(source);
    }

    return () => {
      if (activeImageRef.current) {
        activeImageRef.current.onload = null;
        activeImageRef.current.onerror = null;
        activeImageRef.current = null;
      }
      if (activeObjectUrlRef.current) {
        revokeTrackedObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, [source, autoLoad, load]);

  return {
    image,
    status,
    error,
    dimensions,
    bounds,
    load,
    reset
  };
}
