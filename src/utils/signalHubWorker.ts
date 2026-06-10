self.onmessage = (e) => {
  const { type, detail } = e.data;
  
  if (type === 'scannability-fail') {
    // Dispatch telemetry if opted in
    if (detail.telemetryOptIn) {
      try {
        fetch('/api/telemetry/scannability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine: detail.engine,
            styleId: detail.styleId,
            errorType: detail.errorType,
            timestamp: Date.now()
          })
        }).catch(() => {});
      } catch {}
    }
    
    self.postMessage({ type: 'scannability-status', status: 'fail', latency: Date.now() - detail.timestamp });
  } else if (type === 'render-complete') {
    self.postMessage({ type: 'render-complete-processed', moduleCount: detail.moduleCount, latency: Date.now() - detail.timestamp });
  }
};
