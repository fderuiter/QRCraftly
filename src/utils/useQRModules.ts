import { useState, useEffect } from 'react';
import { QRConfig, QRModules } from '../types';

/**
 * A hook that generates QR code modules from a given value and error correction level.
 * It dynamically imports the 'qrcode' library to reduce initial bundle size.
 *
 * @param value The value to encode in the QR code.
 * @param errorCorrectionLevel The error correction level (L, M, Q, H).
 * @returns The generated QR modules, or null if generation fails or value is empty.
 */
export function useQRModules(
  value: string,
  errorCorrectionLevel: QRConfig['errorCorrectionLevel']
) {
  const [modules, setModules] = useState<QRModules | null>(null);

  useEffect(() => {
    if (!value) {
      setModules(null);
      return;
    }

    let isMounted = true;

    // Dynamic import to keep bundle size small
    import('qrcode').then((QRCode) => {
      if (!isMounted) return;
      try {
        const data = QRCode.create(value, { errorCorrectionLevel });
        // The qrcode library returns an object with modules that has { size, get(row,col) }
        // We cast it to unknown first to avoid TS errors if types don't perfectly align,
        // then pick the 'modules' property which conforms to QRModules.
        const qrModules = (data as unknown as { modules: QRModules }).modules;
        setModules(qrModules);
      } catch (e) {
        console.warn("QR generation failed:", e);
        setModules(null);
      }
    }).catch(err => {
        if (isMounted) {
            console.error("Failed to load qrcode library", err);
            setModules(null);
        }
    });

    return () => { isMounted = false; };
  }, [value, errorCorrectionLevel]);

  return modules;
}
