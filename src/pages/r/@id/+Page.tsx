import React, { useEffect, useState } from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import { decryptUrl, extractKeyFromHash } from '@/utils/encryption';
import { isDangerousUrl } from '@/utils/security';
import { normalizeUrl, SafeUrlPipeline } from '@/utils/url';
import { ShieldAlert, RefreshCw, Lock } from 'lucide-react';

/**
 * Zero-Knowledge Dynamic Link Redirect Resolver Page (/r/:id#key=...).
 * Extracts the decryption key from the URL anchor hash fragment (#key=...),
 * fetches the encrypted ciphertext payload from the edge proxy,
 * decrypts the target URL locally using Web Crypto API,
 * sanitizes the destination URL, and executes browser navigation.
 * @returns The rendered RedirectResolverPage component.
 */
export default function RedirectResolverPage() {
  const pageContext = usePageContext();
  const id = pageContext.routeParams?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveAndRedirect() {
      if (!id) {
        if (isMounted) {
          setErrorMessage("Invalid dynamic link identifier.");
          setIsLoading(false);
        }
        return;
      }

      // Extract decryption key exclusively from URL hash fragment (#key=...)
      const keyHex = extractKeyFromHash(window.location.hash);

      if (!keyHex) {
        if (isMounted) {
          setErrorMessage("Decryption key is missing or invalid in URL fragment (#key=...). Cannot decrypt target destination without the key.");
          setIsLoading(false);
        }
        return;
      }

      try {
        // Fetch encrypted payload from edge API (which increments scan counter anonymously)
        const response = await fetch(`/api/redirect/${encodeURIComponent(id)}`, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error("Dynamic link not found or unavailable.");
        }

        const data = await response.json() as {
          id: string;
          redirectUrl: string;
          iosUrl?: string;
          androidUrl?: string;
        };

        const userAgent = navigator.userAgent || "";
        const isIos = /iPhone|iPad|iPod/i.test(userAgent);
        const isAndroid = /Android/i.test(userAgent);

        let ciphertextPayload = data.redirectUrl;
        if (isIos && data.iosUrl && data.iosUrl.trim()) {
          ciphertextPayload = data.iosUrl;
        } else if (isAndroid && data.androidUrl && data.androidUrl.trim()) {
          ciphertextPayload = data.androidUrl;
        }

        // Decrypt target URL locally using Web Crypto API
        const decryptedPlainUrl = await decryptUrl(ciphertextPayload, keyHex);

        if (!decryptedPlainUrl || !decryptedPlainUrl.trim()) {
          throw new Error("Decrypted destination URL is empty.");
        }

        // Sanitize and validate destination URL before navigating
        const normalized = normalizeUrl(decryptedPlainUrl.trim());
        if (isDangerousUrl(normalized) || SafeUrlPipeline.isDangerous(normalized)) {
          throw new Error(`Security Warning: Destination URL contains an unsafe or blocked protocol scheme (${normalized}).`);
        }

        let parsed: URL;
        try {
          parsed = new URL(normalized);
        } catch (_e) {
          throw new Error("Decrypted URL format is invalid.", { cause: _e });
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error(`Invalid protocol scheme: "${parsed.protocol}". Only http: and https: destinations are permitted.`);
        }

        // Navigate safely to the decrypted destination
        window.location.replace(normalized);
      } catch (err: any) {
        console.error('[Redirect Resolver Error]', err);
        if (isMounted) {
          setErrorMessage(err.message || "An error occurred while resolving the encrypted dynamic link.");
          setIsLoading(false);
        }
      }
    }

    resolveAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (errorMessage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-lg dark:border-rose-900/50 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <ShieldAlert className="size-8" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            Link Resolution Error
          </h1>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
            {errorMessage}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
        {isLoading ? (
          <RefreshCw className="size-7 animate-spin" />
        ) : (
          <Lock className="size-7" />
        )}
      </div>
      <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
        Decrypting Zero-Knowledge Dynamic Link...
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Target destination is being decrypted locally in your browser.
      </p>
    </div>
  );
}
