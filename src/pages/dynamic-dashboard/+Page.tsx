import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Edit2, Save, ExternalLink, QrCode, RefreshCw, X, BarChart2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useRedirector, DynamicQRRecord, ScanAnalytics } from '@/hooks/useRedirector';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/FormFields';
import { isDangerousUrl, sanitizeHref, escapeHtml } from '@/utils/security';
import { normalizeUrl } from '@/utils/url';
import { JsonLdScript } from '@/components/ui/JsonLdScript';
import { generateSchema } from '@/utils/schemaGenerator';
import { resolveDomainForPath } from '@/utils/metadataEngine';
import { usePageContext } from 'vike-react/usePageContext';
import { contentRegistry } from '@/data/contentRegistry';

function AnalyticsView({ analytics }: { analytics: ScanAnalytics }) {
  return (
    <div className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <BarChart2 className="size-5 text-teal-600 dark:text-teal-400" />
          Aggregate Scan Metrics
        </h3>
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-900/50 dark:bg-teal-950/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-6 flex-shrink-0 text-teal-600 dark:text-teal-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-teal-900 dark:text-teal-300">
              Zero-Transit Privacy Enforcement Active
            </h4>
            <p className="text-xs text-teal-800/80 dark:text-teal-300/80">
              To enforce HIPAA compliance and zero-transit data privacy, this dynamic link logs zero IP addresses, location metadata, or browser device fingerprints. Only the aggregate scan count ({analytics.scans}) is tracked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature flag to temporarily suppress dynamic dashboard until Cloudflare edge infrastructure
 * and mock Vite proxies are fully provisioned (#917 / #928).
 */
const ENABLE_DYNAMIC_DASHBOARD = false;

function DashboardContent() {
  const { records, updateRedirect, fetchStats, deleteRecord } = useRedirector();
  const { addToast } = useToast();

  const [analyticsData, setAnalyticsData] = useState<Record<string, ScanAnalytics>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrlValue, setEditUrlValue] = useState('');
  const [editIosUrlValue, setEditIosUrlValue] = useState('');
  const [editAndroidUrlValue, setEditAndroidUrlValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [expandedAnalytics, setExpandedAnalytics] = useState<Record<string, boolean>>({});

  const refreshStats = async (id: string) => {
    setRefreshing(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetchStats(id);
      if (res) {
        setAnalyticsData(prev => ({ ...prev, [id]: res }));
      }
    } finally {
      setRefreshing(prev => ({ ...prev, [id]: false }));
    }
  };

  // Fetch stats on mount for all records
  useEffect(() => {
    records.forEach((r) => {
      refreshStats(r.id);
    });
  }, [records.length]);

  const toggleAnalytics = (id: string) => {
    setExpandedAnalytics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (record: DynamicQRRecord) => {
    setEditingId(record.id);
    setEditUrlValue(record.originalUrl);
    setEditIosUrlValue(record.iosUrl || '');
    setEditAndroidUrlValue(record.androidUrl || '');
    setEditError(null);
  };

  const handleSaveEdit = async (record: DynamicQRRecord) => {
    if (!editUrlValue) {
      setEditError('URL is required.');
      return;
    }

    const normalized = normalizeUrl(editUrlValue);
    if (isDangerousUrl(normalized)) {
      setEditError('Unsafe URL scheme detected.');
      return;
    }

    let finalIos: string | undefined = undefined;
    if (editIosUrlValue.trim()) {
      finalIos = normalizeUrl(editIosUrlValue.trim());
      if (isDangerousUrl(finalIos)) {
        setEditError('Unsafe iOS URL scheme detected.');
        return;
      }
    }

    let finalAndroid: string | undefined = undefined;
    if (editAndroidUrlValue.trim()) {
      finalAndroid = normalizeUrl(editAndroidUrlValue.trim());
      if (isDangerousUrl(finalAndroid)) {
        setEditError('Unsafe Android URL scheme detected.');
        return;
      }
    }

    const success = await updateRedirect(record.id, record.adminKey, normalized, {
      iosUrl: finalIos,
      androidUrl: finalAndroid,
    });
    if (success) {
      addToast({
        type: 'success',
        message: 'Destination URL updated successfully at the edge proxy!',
        duration: 5000,
      });
      setEditingId(null);
    } else {
      setEditError('Failed to update URL on the edge database.');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tracking link from your dashboard? You will lose access to its statistics.')) {
      deleteRecord(id);
      addToast({
        type: 'success',
        message: 'Link removed from local storage.',
        duration: 4000,
      });
    }
  };

  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? '/dynamic-dashboard';
  const resolvedDomain = resolveDomainForPath(urlPathname);
  const schemaData = generateSchema(contentRegistry['dynamic-dashboard'], resolvedDomain, urlPathname);

  return (
    <>
      <JsonLdScript data={schemaData} />
      <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="mb-8">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-5" />
          Back to Designer
        </a>
      </nav>

      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white">
          Dynamic Redirection Dashboard
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Manage your dynamic QR destinations in real-time. Since we store no user accounts, your access keys are saved <strong>securely and only in your local browser storage</strong>.
        </p>
      </header>

      {records.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <QrCode className="mb-4 size-16 text-teal-600 opacity-60" />
          <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">No Dynamic QR Codes Found</h2>
          <p className="mb-6 max-w-sm text-slate-500 dark:text-slate-400">
            Create your first trackable QR code using the URL type and toggle "Trackable Redirect" on the control panel.
          </p>
          <a href="/">
            <Button variant="primary">Create dynamic QR code</Button>
          </a>
        </Card>
      ) : (
        <div className="grid gap-6">
          {records.map((r) => {
            const isEditing = editingId === r.id;
            const analytics = analyticsData[r.id] || { scans: 0 };
            const currentScans = analytics.scans;
            const isRefreshing = refreshing[r.id] ?? false;
            const isExpanded = expandedAnalytics[r.id] ?? true;

            let redirectLinkElement = null;
            const targetUrl = sanitizeHref(r.redirectUrl);
            if (!isDangerousUrl(targetUrl)) {
              redirectLinkElement = (
                <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 dark:text-teal-400" title="Visit redirector">
                  <ExternalLink className="size-4" />
                </a>
              );
            }

            let designerLinkElement = null;
            const designerUrl = `/?value=${encodeURIComponent(r.redirectUrl)}`;
            if (!isDangerousUrl(designerUrl)) {
              designerLinkElement = (
                <a href={designerUrl}>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <QrCode className="size-4" /> Designer
                  </Button>
                </a>
              );
            }

            return (
              <Card key={r.id} className="relative overflow-hidden border-slate-200 dark:border-slate-800">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800 dark:bg-teal-950/40 dark:text-teal-400">
                        Dynamic Tracking Active
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Created: {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Tracking Router (Printed QR Value)</div>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm break-all text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {escapeHtml(r.redirectUrl)}
                        </code>
                        {redirectLinkElement}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Default Target URL</div>
                          <TextField
                            id={`edit-url-${r.id}`}
                            value={editUrlValue}
                            onChange={(e) => setEditUrlValue(e.target.value)}
                            error={editError || undefined}
                            placeholder="https://new-destination.com"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Apple App Store URL (iOS)</div>
                          <TextField
                            id={`edit-ios-url-${r.id}`}
                            value={editIosUrlValue}
                            onChange={(e) => setEditIosUrlValue(e.target.value)}
                            placeholder="https://apps.apple.com/app/id123456789"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Google Play Store URL (Android)</div>
                          <TextField
                            id={`edit-android-url-${r.id}`}
                            value={editAndroidUrlValue}
                            onChange={(e) => setEditAndroidUrlValue(e.target.value)}
                            placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button variant="primary" size="sm" onClick={() => handleSaveEdit(r)}>
                            <Save className="mr-1 size-4" /> Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                            <X className="size-4" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Default Destination</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium break-all text-slate-700 dark:text-slate-300">{escapeHtml(r.originalUrl)}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(r)} title="Edit Destination">
                              <Edit2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                        {r.iosUrl && (
                          <div className="space-y-1 text-xs">
                            <div className="font-semibold tracking-wider text-slate-400 uppercase">iOS Destination (App Store)</div>
                            <span className="font-mono break-all text-slate-700 dark:text-slate-300">{escapeHtml(r.iosUrl)}</span>
                          </div>
                        )}
                        {r.androidUrl && (
                          <div className="space-y-1 text-xs">
                            <div className="font-semibold tracking-wider text-slate-400 uppercase">Android Destination (Play Store)</div>
                            <span className="font-mono break-all text-slate-700 dark:text-slate-300">{escapeHtml(r.androidUrl)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row items-center justify-between border-t border-slate-100 pt-4 md:flex-col md:border-t-0 md:pt-0 dark:border-slate-800">
                    <div className="text-center md:mb-4">
                      <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Cumulative Scans</div>
                      <div className="mt-1 flex items-center justify-center gap-2">
                        <span className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">{currentScans}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => refreshStats(r.id)}
                          className={isRefreshing ? 'animate-spin' : ''}
                          title="Refresh Stats"
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAnalytics(r.id)}
                        className="flex items-center gap-1"
                      >
                        <BarChart2 className="size-4 text-teal-600 dark:text-teal-400" />
                        Analytics {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </Button>
                      {designerLinkElement}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20" title="Delete Link">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && <AnalyticsView analytics={analytics} />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}

/**
 * Dynamic Redirection Dashboard Page Component.
 * Direct visits are gracefully redirected to the home page during temporary suppression (#917).
 * @returns The rendered DynamicDashboardPage component.
 */
export default function DynamicDashboardPage() {
  useEffect(() => {
    if (!ENABLE_DYNAMIC_DASHBOARD && typeof window !== 'undefined') {
      window.location.replace('/');
    }
  }, []);

  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? '/dynamic-dashboard';
  const resolvedDomain = resolveDomainForPath(urlPathname);
  const schemaData = generateSchema(contentRegistry['dynamic-dashboard'], resolvedDomain, urlPathname);

  if (!ENABLE_DYNAMIC_DASHBOARD) {
    return (
      <>
        <JsonLdScript data={schemaData} />
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Redirecting to home...
          </p>
        </div>
      </>
    );
  }

  return <DashboardContent />;
}

