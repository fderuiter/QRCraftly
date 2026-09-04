/**
 * Backward-compatibility re-export shim.
 * Canonical implementation now lives in @/packages/optical-transfer/sender.
 */
export {
  PreallocatedFramePool,
  type CachedFrame,
  shuffleInPlace,
} from '@/packages/optical-transfer/sender';
