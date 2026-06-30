import wasmUrl from './reasoning-engine.wasm?url';

let initialized = false;

// Store local dirty buffers in volatile memory
const volatileBufferMap = new Map<string, string>();

async function initWasm() {
  if (initialized) return;
  try {
    const response = await fetch(wasmUrl);
    const buffer = await response.arrayBuffer();
    // Validate it's under 50MB
    if (buffer.byteLength > 50 * 1024 * 1024) {
      throw new Error('WASM module exceeds 50MB constraint');
    }
    await WebAssembly.instantiate(buffer, {});
    initialized = true;
    self.postMessage({ type: 'init-success' });
  } catch (error) {
    console.error('Failed to initialize WASM reasoning engine:', error);
    self.postMessage({ type: 'init-error', error: String(error) });
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'init') {
    await initWasm();
  } else if (type === 'sync-buffer') {
    // Volatile memory sync - store buffer locally in the worker
    const { id, content } = payload;
    volatileBufferMap.set(id, content);
    
    // Simulate WASM reasoning validation in sub-100ms
    // Since we don't have real python compiled WASM, we mock it using the text buffer
    const violations = [];
    if (content && typeof content === 'string') {
      if (content.includes('<script>')) {
        violations.push('XSS_VIOLATION');
      }
      if (content.includes('DROP TABLE')) {
        violations.push('SQL_INJECTION');
      }
    }
    
    self.postMessage({ 
      type: 'validation-result', 
      payload: { id, violations } 
    });
  } else if (type === 'clear-buffer') {
    const { id } = payload;
    volatileBufferMap.delete(id);
  }
};
