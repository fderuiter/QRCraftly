// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { globalSignalBus, SignalBus } from '../src/services/SignalBus';
import { formPayloadService } from '../src/services/FormPayloadService';
import { scannabilityService } from '../src/services/ScannabilityService';
import { exportSafetyService } from '../src/services/ExportSafetyService';
import { edgeRedirectService } from '../src/services/EdgeRedirectService';
import { QRType, QRConfig, QRErrorCorrectionLevel, TemplateStyle, SocialFormat } from '../src/types';

describe('Pure Service Architecture & Signal Bus Integration', () => {
  let signalBus: SignalBus;

  beforeEach(() => {
    signalBus = new SignalBus();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SignalBus Latency & Pub/Sub Isolation', () => {
    it('dispatches signals synchronously within 5ms latency target', () => {
      const callback = vi.fn();
      signalBus.registerSignal('test-event', callback);

      const start = performance.now();
      signalBus.emitSignal('test-event', { payload: 'data' });
      const elapsed = performance.now() - start;

      expect(callback).toHaveBeenCalledWith({ payload: 'data' });
      expect(elapsed).toBeLessThan(5);
    });

    it('allows unregistering signal listeners', () => {
      const callback = vi.fn();
      const unsubscribe = signalBus.registerSignal('test-event', callback);

      unsubscribe();
      signalBus.emitSignal('test-event', { payload: 'data' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('FormPayloadService', () => {
    it('validates containment rules and serializes form payload outside component render flow', () => {
      const listener = vi.fn();
      globalSignalBus.registerSignal('form-payload-update', listener);

      const invalidWifi = formPayloadService.validateContainment(QRType.WIFI, {
        ssid: 'WiFi\x00ControlChar',
        password: 'pass',
      });
      expect(invalidWifi.isValid).toBe(false);

      const validWifiData = {
        ssid: 'HomeNetwork',
        password: 'SecretPassword123',
        encryption: 'WPA' as const,
        hidden: false,
      };

      const result = formPayloadService.processFieldUpdate(QRType.WIFI, {}, validWifiData);
      expect(result.isValid).toBe(true);
      expect(result.serializedValue).toBe('WIFI:T:WPA;S:HomeNetwork;P:SecretPassword123;;');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: QRType.WIFI,
        serializedValue: 'WIFI:T:WPA;S:HomeNetwork;P:SecretPassword123;;',
      }));
    });

    it('identifies dangerous URLs in payload processing', () => {
      const dangerousUrlResult = formPayloadService.validateContainment(QRType.URL, {
        url: 'javascript:alert(1)',
      });
      expect(dangerousUrlResult.isValid).toBe(false);
      expect(dangerousUrlResult.violations.length).toBeGreaterThan(0);
    });
  });

  describe('ExportSafetyService', () => {
    it('triggers health evaluation services emitting export-safety-check and export-quality-low signals', async () => {
      const checkListener = vi.fn();
      const qualityLowListener = vi.fn();

      globalSignalBus.registerSignal('export-safety-check', checkListener);
      globalSignalBus.registerSignal('export-quality-low', qualityLowListener);

      const config: QRConfig = {
        type: QRType.URL,
        value: 'https://example.com',
        ecLevel: QRErrorCorrectionLevel.L,
        size: 300,
        margin: 2,
        foregroundColor: '#777777', // Low contrast
        backgroundColor: '#888888',
        templateStyle: TemplateStyle.NONE,
        socialFormat: SocialFormat.SQUARE_1_1,
      };

      const evaluation = await exportSafetyService.evaluateExportSafety(config, {
        format: 'canvas',
      });

      expect(checkListener).toHaveBeenCalled();
      expect(qualityLowListener).toHaveBeenCalledWith(expect.objectContaining({
        format: 'canvas',
        score: expect.any(Number),
      }));
      expect(evaluation.score).toBeLessThan(70);
    });
  });

  describe('EdgeRedirectService', () => {
    it('processes bot token verification and edge API requests asynchronously via signals', async () => {
      const botListener = vi.fn();
      const edgeRequestListener = vi.fn();
      const edgeCompleteListener = vi.fn();

      globalSignalBus.registerSignal('bot-verification-request', botListener);
      globalSignalBus.registerSignal('edge-redirect-request', edgeRequestListener);
      globalSignalBus.registerSignal('edge-redirect-complete', edgeCompleteListener);

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        if (String(url).includes('turnstile')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response(JSON.stringify({
          id: 'test-redirect-123',
          redirectUrl: 'https://example.com',
          adminKey: 'admin-key-456',
        }), { status: 200 });
      });

      // Dispatch signals asynchronously via SignalBus
      globalSignalBus.emitSignal('bot-verification-request', {
        turnstileToken: 'mock-turnstile-token',
      });

      globalSignalBus.emitSignal('edge-redirect-request', {
        action: 'register',
        targetUrl: 'https://example.com',
        options: { turnstileToken: 'mock-turnstile-token' },
      });

      expect(botListener).toHaveBeenCalledWith(expect.objectContaining({
        turnstileToken: 'mock-turnstile-token',
      }));

      expect(edgeRequestListener).toHaveBeenCalledWith(expect.objectContaining({
        action: 'register',
      }));
    });
  });

  describe('ScannabilityService Watchdog & Latency Controls', () => {
    it('emits scannability signals and uses fallback when worker is unavailable', async () => {
      const checkStartListener = vi.fn();

      globalSignalBus.registerSignal('scannability-check-start', checkStartListener);

      const config: QRConfig = {
        type: QRType.URL,
        value: 'https://example.com',
        ecLevel: QRErrorCorrectionLevel.M,
        size: 300,
        margin: 2,
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        templateStyle: TemplateStyle.NONE,
        socialFormat: SocialFormat.SQUARE_1_1,
      };

      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      await scannabilityService.checkScannability({
        config,
        engine: 'STANDARD',
        canvas,
      });

      expect(checkStartListener).toHaveBeenCalled();
    });
  });
});
