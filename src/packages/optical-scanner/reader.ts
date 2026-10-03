/**
 * Optical Detection Engine — zxing Reader Seam (ADR 0023)
 * The zxing-cpp WebAssembly reader as the scanner worker runs it, for headless callers that
 * compile `zxing_reader.wasm` themselves (the decoder benchmark and tests). The app never imports
 * this entry: its worker installs the module the main thread posts to it.
 */
export {
  installZxing,
  decodeWithZxing,
  zxingState,
  type ZxingState,
} from './lib/zxingReader';
