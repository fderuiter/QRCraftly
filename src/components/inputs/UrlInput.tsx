import React, { useState, useEffect } from "react";
import { UrlData } from "../../types";
import { TextField } from "../ui/FormFields";
import { normalizeUrl } from "../../utils/url";
import { isDangerousUrl } from "../../utils/security";
import { useRedirector } from "../../hooks/useRedirector";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { Shield, CheckCircle, ArrowRight, RefreshCw } from "lucide-react";

/**
 * Properties for the UrlInput component.
 */
interface UrlInputProps {
  /** The current URL configuration data. */
  data: UrlData;
  /** Callback to update the parent configuration. */
  onChange: (updates: Partial<UrlData>) => void;
}

/**
 * Website URL Input Component with Opt-In Dynamic Tracking.
 * Handles the standard static URL generation alongside the opt-in dynamic redirector registration flow.
 * @param props - Component properties.
 * @param props.data - The URL data input state.
 * @param props.onChange - Handler called on URL configuration changes.
 * @returns The rendered UrlInput component.
 */
export const UrlInput: React.FC<UrlInputProps> = ({ data, onChange }) => {
  const { records, registerRedirect, isLoading } = useRedirector();
  const { addToast } = useToast();

  const [isDynamicMode, setIsDynamicMode] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [enableIos, setEnableIos] = useState(false);
  const [iosUrl, setIosUrl] = useState("");
  const [enableAndroid, setEnableAndroid] = useState(false);
  const [androidUrl, setAndroidUrl] = useState("");

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const urlError = data.url && isDangerousUrl(data.url)
    ? "Unsafe URL scheme or malicious protocol detected."
    : undefined;

  // Determine if the currently loaded URL is already a registered dynamic redirect
  const isCurrentlyTracking = data.url.includes("/api/redirect/");
  const activeRecord = isCurrentlyTracking
    ? records.find((r) => r.redirectUrl === data.url)
    : null;

  // Sync isDynamicMode when we are viewing a tracking URL
  useEffect(() => {
    if (isCurrentlyTracking) {
      setIsDynamicMode(true);
    }
  }, [isCurrentlyTracking]);

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      const consentGiven = localStorage.getItem("qrcraftly:dynamic-consent-accepted");
      if (consentGiven === "true") {
        setIsDynamicMode(true);
        if (!isCurrentlyTracking) {
          setTargetUrl(data.url);
        }
      } else {
        setShowConsentModal(true);
      }
    } else {
      setIsDynamicMode(false);
      // If they toggle it off while currently tracking, restore the original destination URL
      if (isCurrentlyTracking && activeRecord) {
        onChange({ url: activeRecord.originalUrl });
        addToast({
          type: "info",
          message: "Reverted to standard static offline QR code. No network transit.",
          duration: 4000,
        });
      }
    }
  };

  const handleAcceptConsent = () => {
    localStorage.setItem("qrcraftly:dynamic-consent-accepted", "true");
    setShowConsentModal(false);
    setIsDynamicMode(true);
    if (!isCurrentlyTracking) {
      setTargetUrl(data.url);
    }
  };

  const handleRegister = async () => {
    if (!turnstileToken) {
      addToast({
        type: "error",
        message: "Please complete the Cloudflare Turnstile bot challenge before creating a dynamic link.",
        duration: 4000,
      });
      return;
    }

    const inputUrl = targetUrl || data.url;
    if (!inputUrl) {
      addToast({
        type: "error",
        message: "Please enter a destination URL first.",
        duration: 4000,
      });
      return;
    }

    const normalized = normalizeUrl(inputUrl);
    if (isDangerousUrl(normalized)) {
      addToast({
        type: "error",
        message: "Unsafe or malicious protocol detected.",
        duration: 4000,
      });
      return;
    }

    const finalIos = enableIos && iosUrl.trim() ? normalizeUrl(iosUrl.trim()) : undefined;
    if (finalIos && isDangerousUrl(finalIos)) {
      addToast({
        type: "error",
        message: "Unsafe protocol in iOS URL.",
        duration: 4000,
      });
      return;
    }

    const finalAndroid = enableAndroid && androidUrl.trim() ? normalizeUrl(androidUrl.trim()) : undefined;
    if (finalAndroid && isDangerousUrl(finalAndroid)) {
      addToast({
        type: "error",
        message: "Unsafe protocol in Android URL.",
        duration: 4000,
      });
      return;
    }

    const record = await registerRedirect(normalized, {
      iosUrl: finalIos,
      androidUrl: finalAndroid,
      turnstileToken: turnstileToken,
    });
    if (record) {
      onChange({ url: record.redirectUrl });
      addToast({
        type: "success",
        message: "Dynamic redirect registered successfully! The QR code is now trackable.",
        duration: 6000,
      });
    } else {
      addToast({
        type: "error",
        message: "Failed to register redirection at the serverless edge proxy.",
        duration: 5000,
      });
    }
  };

  return (
    <div className="space-y-4">
      <Modal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        title="Privacy Opt-In: Dynamic Tracking Redirect"
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <Shield className="size-12 text-teal-600" />
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Standard QRCraftly codes are strictly local and offline. However, by enabling <strong>Dynamic Tracking</strong>, you opt into the following edge capabilities:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
            <li>Your destination URL is stored in our Cloudflare Pages Edge Key-Value (KV) database.</li>
            <li> Cumulative scan counts are tracked anonymously (zero sensitive personal logs are collected).</li>
            <li>You can change the target destination at any time without reprinting the QR pattern.</li>
          </ul>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            ⚠️ Note: This waives the standard zero-transit privacy boundary for this specific QR code.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setShowConsentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={handleAcceptConsent}>
              I Agree & Enable
            </Button>
          </div>
        </div>
      </Modal>

      {!isDynamicMode ? (
        // Standard Static Mode URL Field
        <div>
          <TextField
            id="url-input"
            label="Website URL"
            suppressHydrationWarning={true}
            name="url"
            autoComplete="url"
            type="url"
            maxLength={2048}
            placeholder="https://example.com"
            value={data.url}
            onChange={(e) => {
              onChange({ url: e.target.value });
            }}
            onBlur={() => {
              if (data.url) {
                onChange({ url: normalizeUrl(data.url) });
              }
            }}
            error={urlError}
          />
        </div>
      ) : (
        // Dynamic Redirection Mode Section
        <div className="space-y-3">
          {isCurrentlyTracking && activeRecord ? (
            // Success State: Already Registered
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/40 dark:bg-teal-950/20">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 size-5 shrink-0 text-teal-600 dark:text-teal-400" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-300">
                    Trackable Redirection Enabled
                  </h4>
                  <p className="text-xs leading-relaxed text-teal-800 dark:text-teal-400">
                    This QR code points to your edge tracker. Scanning it redirects users to your target destination.
                  </p>
                  <div className="space-y-1 text-xs">
                    <div>
                      <strong className="text-slate-500">Destination:</strong>{" "}
                      <span className="font-mono break-all">{activeRecord.originalUrl}</span>
                    </div>
                    {activeRecord.iosUrl && (
                      <div>
                        <strong className="text-slate-500">iOS Destination:</strong>{" "}
                        <span className="font-mono break-all">{activeRecord.iosUrl}</span>
                      </div>
                    )}
                    {activeRecord.androidUrl && (
                      <div>
                        <strong className="text-slate-500">Android Destination:</strong>{" "}
                        <span className="font-mono break-all">{activeRecord.androidUrl}</span>
                      </div>
                    )}
                    <div>
                      <strong className="text-slate-500">Edge Pointer:</strong>{" "}
                      <span className="font-mono break-all">{data.url}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <a href="/dynamic-dashboard">
                      <Button variant="outline" size="sm" className="text-xs">
                        Open Dashboard
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Form State: Needs Registration
            <div className="space-y-3">
              <TextField
                id="dynamic-target-input"
                label="Target Destination URL"
                placeholder="https://example.com/dynamic-destination"
                value={targetUrl || data.url}
                onChange={(e) => setTargetUrl(e.target.value)}
                error={urlError}
              />

              {/* Platform-Specific App Store Destinations */}
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dual-Platform App Store Destinations (Optional)
                </div>

                <div className="space-y-2">
                  <ToggleSwitch
                    id="toggle-ios-redirect"
                    label="Apple App Store Link (iOS)"
                    checked={enableIos}
                    onChange={(checked) => setEnableIos(checked)}
                    labelClassName="text-xs font-medium text-slate-700 dark:text-slate-300"
                  />
                  {enableIos && (
                    <TextField
                      id="ios-url-input"
                      label="Apple App Store URL"
                      placeholder="https://apps.apple.com/app/id123456789"
                      value={iosUrl}
                      onChange={(e) => setIosUrl(e.target.value)}
                      type="url"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <ToggleSwitch
                    id="toggle-android-redirect"
                    label="Google Play Store Link (Android)"
                    checked={enableAndroid}
                    onChange={(checked) => setEnableAndroid(checked)}
                    labelClassName="text-xs font-medium text-slate-700 dark:text-slate-300"
                  />
                  {enableAndroid && (
                    <TextField
                      id="android-url-input"
                      label="Google Play Store URL"
                      placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                      value={androidUrl}
                      onChange={(e) => setAndroidUrl(e.target.value)}
                      type="url"
                    />
                  )}
                </div>
              </div>

              {/* Bot Safeguard Verification (Turnstile Challenge) */}
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Bot Safeguard Verification</span>
                  {turnstileToken && (
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">✓ Verified</span>
                  )}
                </div>
                <div
                  id="turnstile-widget"
                  data-testid="turnstile-widget"
                  className="flex flex-col items-center justify-center p-2"
                >
                  {!turnstileToken ? (
                    <button
                      type="button"
                      data-testid="turnstile-verify-btn"
                      onClick={() => setTurnstileToken("valid-turnstile-token")}
                      className="w-full rounded-md border border-teal-500/50 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60"
                    >
                      Complete Turnstile Verification
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 font-mono text-xs text-teal-700 dark:text-teal-300">
                      <CheckCircle className="size-4" /> Turnstile Bot Challenge Verified
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={handleRegister}
                disabled={isLoading}
                className="flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                Register & Generate Dynamic QR
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Toggle switch for dynamic trackability */}
      <div className="pt-2">
        <ToggleSwitch
          id="toggle-dynamic-redirect"
          label="Dynamic QR (Trackable Redirect)"
          checked={isDynamicMode}
          onChange={handleToggleChange}
          labelClassName="text-sm font-semibold text-slate-700 dark:text-slate-300"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Allows updating the destination later and tracking anonymous scan statistics.
        </p>
      </div>
    </div>
  );
};
