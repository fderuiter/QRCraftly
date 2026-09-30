import { useCallback } from 'react';
import { useToast } from './ui/Toast';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

/**
 * Registers the service worker and shows a persistent toast with a Reload
 * action when a new version of the app is ready. Renders nothing itself.
 * @param props Component properties.
 * @param props.enabled Whether to register the service worker.
 * @returns null
 */
export function ServiceWorkerUpdatePrompt({ enabled }: { enabled: boolean }) {
  const { addToast } = useToast();

  const onUpdateAvailable = useCallback(
    (applyUpdate: () => void) => {
      addToast({
        type: 'info',
        message: 'A new version of QRCraftly is available.',
        persistent: true,
        action: { label: 'Reload', onClick: applyUpdate },
      });
    },
    [addToast]
  );

  useServiceWorkerUpdate({ onUpdateAvailable, enabled });
  return null;
}
