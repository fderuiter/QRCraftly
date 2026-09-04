/**
 * Backward-compatibility re-export shim.
 * Canonical hook implementation now lives in @/packages/optical-transfer/client.
 */
export {
  useOpticalSender as useAnimatedQrSender,
  type UseOpticalSenderOptions as UseAnimatedQrSenderOptions,
  sanitizeStreamConfig,
  verifyHandshakeFrame,
} from '@/packages/optical-transfer/client';
