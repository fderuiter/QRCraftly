import { QRType } from '../types';
import { QR_GENERATORS } from './qrHelpers';

export function combineIds(...ids: (string | undefined | null | false)[]): string | undefined {
  const combined = ids.filter(Boolean).join(' ');
  return combined.length > 0 ? combined : undefined;
}

export function getQrTypeLabel(type: QRType): string {
  switch (type) {
    case QRType.WIFI:
      return 'WiFi Network';
    case QRType.URL:
      return 'URL';
    case QRType.TEXT:
      return 'Text';
    case QRType.EVENT:
      return 'Event';
    case QRType.VCARD:
      return 'Contact';
    case QRType.EMAIL:
      return 'Email';
    case QRType.PHONE:
      return 'Phone';
    case QRType.SMS:
      return 'SMS';
    case QRType.PAYMENT:
      return 'Payment';
    case QRType.LOCATION:
      return 'Location';
    case QRType.MEETING:
      return 'Meeting';
    case QRType.SOCIAL:
      return 'Social';
    default:
      return type;
  }
}

export function getQrTypeDescription(type: QRType, value: string): string {
  if (!value) return '';
  const generator = QR_GENERATORS[type];
  if (!generator) return value;
  try {
    const data = generator.hydrate(value);
    if (!data) return value;
    switch (type) {
      case QRType.WIFI:
        return data.ssid || '';
      case QRType.URL:
        return data.url || '';
      case QRType.TEXT:
        return data.text || '';
      case QRType.EVENT:
        return data.title || '';
      case QRType.VCARD: {
        const nameParts = [data.firstName, data.lastName].filter(Boolean);
        return nameParts.join(' ') || data.organization || '';
      }
      case QRType.EMAIL:
        return data.email || '';
      case QRType.PHONE:
        return data.number || '';
      case QRType.SMS:
        return data.number || '';
      case QRType.PAYMENT:
        return data.address || '';
      case QRType.LOCATION:
        if (data.latitude && data.longitude) {
          return `${data.latitude}, ${data.longitude}`;
        }
        return '';
      case QRType.MEETING:
        return data.url || '';
      case QRType.SOCIAL:
        return data.handle ? `@${data.handle}` : '';
      default:
        return value;
    }
  } catch {
    return value;
  }
}

/**
 * Announce a message politely to screen readers using a visually hidden live region.
 * @param message
 */
export function announcePolitely(message: string) {
  if (typeof document === 'undefined') return;
  let liveRegion = document.getElementById('dynamic-focus-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'dynamic-focus-live-region';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('role', 'status');
    // Ensure it is visually hidden
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.padding = '0';
    liveRegion.style.margin = '-1px';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.borderWidth = '0';
    document.body.appendChild(liveRegion);
  }

  // Clear content first to trigger some assistive tech reliably
  liveRegion.textContent = '';
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }, 50);
}

