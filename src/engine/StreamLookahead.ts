/**
 * Backward-compatibility re-export shim.
 * Canonical implementation now lives in @/packages/optical-transfer.
 */
export {
  StreamLookaheadReceiver,
  type StreamLookaheadConfig,
  DANGEROUS_SCHEMES,
  decodeHtmlEntities,
  recursiveDecode,
} from '@/packages/optical-transfer';
