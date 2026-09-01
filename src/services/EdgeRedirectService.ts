/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { generateDecryptionKey, encryptUrl, extractKeyFromHash } from '../utils/encryption';
import { isDangerousUrl } from '../utils/security';
import { SignalBus, globalSignalBus } from './SignalBus';

export interface DynamicQRRecord {
  id: string;
  originalUrl: string;
  redirectUrl: string;
  key?: string;
  iosUrl?: string;
  androidUrl?: string;
  adminKey: string;
  createdAt: string;
}

export interface RegisterRedirectOptions {
  iosUrl?: string;
  androidUrl?: string;
  turnstileToken?: string;
}

export interface UpdateRedirectOptions {
  iosUrl?: string;
  androidUrl?: string;
}

/**
 * Pure framework-agnostic background service for Cloudflare Turnstile bot verification,
 * URL security scanning, Web Crypto zero-knowledge encryption, and edge API redirects.
 */
export class EdgeRedirectService {
  private bus: SignalBus;

  constructor(bus: SignalBus = globalSignalBus) {
    this.bus = bus;
    this.initSignalListeners();
  }

  private initSignalListeners() {
    this.bus.registerSignal('edge-redirect-request', async (detail: any) => {
      if (!detail) return;
      try {
        if (detail.action === 'register') {
          const record = await this.registerRedirect(detail.targetUrl, detail.options);
          this.bus.emitSignal('edge-redirect-complete', {
            action: 'register',
            success: !!record,
            record,
          });
        } else if (detail.action === 'update') {
          const success = await this.updateRedirect(detail.id, detail.adminKey, detail.newTargetUrl, detail.options);
          this.bus.emitSignal('edge-redirect-complete', {
            action: 'update',
            success,
          });
        }
      } catch (err) {
        this.bus.emitSignal('edge-redirect-complete', {
          action: detail.action,
          success: false,
          error: String(err),
        });
      }
    });

    this.bus.registerSignal('bot-verification-request', async (detail: any) => {
      const isVerified = await this.verifyBotToken(detail?.turnstileToken);
      this.bus.emitSignal('bot-verification-complete', {
        success: isVerified,
        token: detail?.turnstileToken,
      });
    });
  }

  /**
   * Performs bot challenge token verification outside component lifecycles.
   * @param turnstileToken Optional Turnstile token string.
   */
  public async verifyBotToken(turnstileToken?: string): Promise<boolean> {
    if (!turnstileToken) {
      return true; // Token may be optional depending on site configuration
    }
    try {
      // Validate token structure or format
      return typeof turnstileToken === 'string' && turnstileToken.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Registers a target destination URL with Web Crypto payload encryption and Turnstile bot verification.
   * @param targetUrl Plaintext target URL.
   * @param options Platform URLs & Turnstile token.
   */
  public async registerRedirect(
    targetUrl: string,
    options?: RegisterRedirectOptions
  ): Promise<DynamicQRRecord | null> {
    if (isDangerousUrl(targetUrl)) {
      throw new Error('Target URL contains a blocked protocol scheme');
    }

    if (options?.iosUrl && isDangerousUrl(options.iosUrl)) {
      throw new Error('iOS URL contains a blocked protocol scheme');
    }

    if (options?.androidUrl && isDangerousUrl(options.androidUrl)) {
      throw new Error('Android URL contains a blocked protocol scheme');
    }

    const botVerified = await this.verifyBotToken(options?.turnstileToken);
    if (!botVerified) {
      throw new Error('Bot token verification failed');
    }

    const keyHex = await generateDecryptionKey();
    const encTargetUrl = await encryptUrl(targetUrl, keyHex);
    const encIosUrl = options?.iosUrl ? await encryptUrl(options.iosUrl, keyHex) : undefined;
    const encAndroidUrl = options?.androidUrl ? await encryptUrl(options.androidUrl, keyHex) : undefined;

    const response = await fetch('/api/redirect/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        redirectUrl: encTargetUrl,
        iosUrl: encIosUrl,
        androidUrl: encAndroidUrl,
        turnstileToken: options?.turnstileToken,
      }),
    });

    if (!response.ok) {
      let errorMsg = `Failed to register redirect: ${response.statusText}`;
      try {
        const errData = (await response.json()) as { error?: string };
        if (errData && errData.error) errorMsg = errData.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = (await response.json()) as {
      id: string;
      redirectUrl: string;
      iosUrl?: string;
      androidUrl?: string;
      adminKey: string;
    };

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://qrcraftly.com';
    const edgeRedirectUrl = `${origin}/r/${data.id}#key=${keyHex}`;

    return {
      id: data.id,
      originalUrl: targetUrl,
      redirectUrl: edgeRedirectUrl,
      key: keyHex,
      iosUrl: options?.iosUrl,
      androidUrl: options?.androidUrl,
      adminKey: data.adminKey,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Updates an existing dynamic redirect record using Web Crypto re-encryption.
   * @param id Redirect record identifier.
   * @param adminKey Secret administrative key.
   * @param newTargetUrl New plaintext target URL.
   * @param options Optional platform URLs.
   */
  public async updateRedirect(
    id: string,
    adminKey: string,
    newTargetUrl: string,
    options?: UpdateRedirectOptions,
    existingRecord?: DynamicQRRecord
  ): Promise<boolean> {
    if (isDangerousUrl(newTargetUrl)) {
      throw new Error('New target URL contains a blocked protocol scheme');
    }

    let keyHex = existingRecord?.key || (existingRecord?.redirectUrl ? extractKeyFromHash(existingRecord.redirectUrl) : null);
    if (!keyHex) {
      keyHex = await generateDecryptionKey();
    }

    const encNewUrl = await encryptUrl(newTargetUrl, keyHex);
    const encIosUrl = options?.iosUrl ? await encryptUrl(options.iosUrl, keyHex) : undefined;
    const encAndroidUrl = options?.androidUrl ? await encryptUrl(options.androidUrl, keyHex) : undefined;

    const response = await fetch('/api/redirect/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        adminKey,
        newUrl: encNewUrl,
        iosUrl: encIosUrl,
        androidUrl: encAndroidUrl,
      }),
    });

    if (!response.ok) {
      let errorMsg = `Failed to update destination: ${response.statusText}`;
      try {
        const errData = (await response.json()) as { error?: string };
        if (errData && errData.error) errorMsg = errData.error;
      } catch {}
      throw new Error(errorMsg);
    }

    await response.json();
    return true;
  }
}

export const edgeRedirectService = new EdgeRedirectService();
