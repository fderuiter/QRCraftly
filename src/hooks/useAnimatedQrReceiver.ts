/**
 * Backward-compatibility re-export shim.
 * Canonical hook implementation now lives in @/packages/optical-transfer/client.
 */
export {
  useOpticalReceiver as useAnimatedQrReceiver,
  type UseOpticalReceiverOptions as UseAnimatedQrReceiverOptions,
  type HandshakeInfo,
} from '@/packages/optical-transfer/client';
