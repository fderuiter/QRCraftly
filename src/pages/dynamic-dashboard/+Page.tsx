import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Edit2, Save, ExternalLink, QrCode, RefreshCw, X, BarChart2, Smartphone, Monitor, Tablet, Globe, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useRedirector, DynamicQRRecord, ScanAnalytics } from '@/hooks/useRedirector';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/FormFields';
import { isDangerousUrl, sanitizeHref, escapeHtml } from '@/utils/security';
import { normalizeUrl } from '@/utils/url';

/**
 *
 */
type TimeRange = '24h' | '7d' | '30d' | 'all';

/**
 *
 */
interface TrendChartProps {
  /**
   *
   */
  analytics: ScanAnalytics;
  /**
   *
   */
  timeRange: TimeRange;
}

function TrendChart({ analytics, timeRange }: TrendChartProps) {
  let chartData: Array<{ label: string; count: number }> = [];

  if (timeRange === '24h') {
    const hourly = analytics.hourly || [];
    chartData = hourly.slice(-24).map(h => ({
      label: h.hour.length >= 13 ? h.hour.slice(11, 13) + ':00' : h.hour,
      count: h.count,
    }));
  } else {
    const daily = analytics.daily || [];
    const limit = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
    chartData = daily.slice(-limit).map(d => ({
      label: d.date.length >= 10 ? d.date.slice(5) : d.date,
      count: d.count,
    }));
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
        <BarChart2 className="mb-2 size-8 text-slate-400" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No scan activity recorded for this period yet.</p>
        <p className="text-xs text-slate-400">Scan your QR code to record real-time telemetry.</p>
      </div>
    );
  }

  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const chartHeight = 120;

  return (
    <div className="space-y-2">
      <div className="relative h-40 w-full rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
        <div className="flex h-full items-end gap-1.5 sm:gap-2">
          {chartData.map((item, index) => {
            const barHeight = Math.max((item.count / maxCount) * (chartHeight - 20), item.count > 0 ? 6 : 2);
            return (
              <div key={index} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                {/* Tooltip */}
                <div className="pointer-events-none absolute -top-8 z-10 hidden rounded bg-slate-800 px-2 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-md group-hover:block dark:bg-slate-200 dark:text-slate-900">
                  {item.count} {item.count === 1 ? 'scan' : 'scans'} ({item.label})
                </div>
                {/* Bar */}
                <div
                  style={{ height: `${barHeight}px` }}
                  className={`w-full rounded-t transition-all ${
                    item.count > 0 ? 'bg-teal-500 hover:bg-teal-600 dark:bg-teal-400 dark:hover:bg-teal-300' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                  aria-label={`${item.label}: ${item.count} scans`}
                />
                <span className="mt-1 max-w-full truncate text-[10px] text-slate-400">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ analytics }: { analytics: ScanAnalytics }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const devices = analytics.devices || { mobile: 0, desktop: 0, tablet: 0, other: 0 };
  const totalDeviceScans = (devices.mobile + devices.desktop + devices.tablet + devices.other) || 1;
  const mobilePct = Math.round((devices.mobile / totalDeviceScans) * 100);
  const desktopPct = Math.round((devices.desktop / totalDeviceScans) * 100);
  const tabletPct = Math.round((devices.tablet / totalDeviceScans) * 100);

  const locations = analytics.locations || {};
  const locationList = Object.entries(locations).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <BarChart2 className="size-5 text-teal-600 dark:text-teal-400" />
          Interactive Scan Analytics
        </h3>

        {/* Time Range Selector */}
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                timeRange === range
                  ? 'bg-white text-teal-700 shadow-xs dark:bg-slate-700 dark:text-teal-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Trend Chart */}
      <TrendChart analytics={analytics} timeRange={timeRange} />

      {/* Metrics Breakdown Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Breakdown */}
        <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Smartphone className="size-4 text-teal-600 dark:text-teal-400" />
            Device Breakdown
          </h4>
          <div className="space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Smartphone className="size-3" /> Mobile</span>
                <span>{devices.mobile} ({mobilePct}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${mobilePct}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Monitor className="size-3" /> Desktop</span>
                <span>{devices.desktop} ({desktopPct}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${desktopPct}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Tablet className="size-3" /> Tablet</span>
                <span>{devices.tablet} ({tabletPct}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${tabletPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Globe className="size-4 text-teal-600 dark:text-teal-400" />
            Top Locations
          </h4>
          {locationList.length === 0 ? (
            <p className="text-xs text-slate-400">No regional data recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {locationList.map(([country, count]) => (
                <span key={country} className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <span>{country}</span>
                  <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] text-teal-800 dark:bg-teal-950 dark:text-teal-300">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Scan History */}
      {analytics.events && analytics.events.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Clock className="size-4 text-teal-600 dark:text-teal-400" />
            Recent Scan Activity
          </h4>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Device</th>
                  <th className="p-2.5">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.events.slice(0, 10).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-2.5 text-slate-700 dark:text-slate-300">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="p-2.5 text-slate-600 capitalize dark:text-slate-400">{e.device}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">{e.location?.country || 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Dynamic Redirection Dashboard Component.
 * Enables listing, tracking stats, and updating target destinations for dynamic QR codes from local storage.
 * @returns The rendered DynamicDashboardPage component.
 */
export default function DynamicDashboardPage() {
  const { records, updateRedirect, fetchStats, deleteRecord } = useRedirector();
  const { addToast } = useToast();

  const [analyticsData, setAnalyticsData] = useState<Record<string, ScanAnalytics>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrlValue, setEditUrlValue] = useState('');
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

    const success = await updateRedirect(record.id, record.adminKey, normalized);
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

  return (
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
                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Update Target URL</div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <TextField
                            id={`edit-url-${r.id}`}
                            value={editUrlValue}
                            onChange={(e) => setEditUrlValue(e.target.value)}
                            error={editError || undefined}
                            placeholder="https://new-destination.com"
                            className="flex-1"
                          />
                          <div className="flex gap-2 self-start sm:self-center">
                            <Button variant="primary" size="sm" onClick={() => handleSaveEdit(r)}>
                              <Save className="mr-1 size-4" /> Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                              <X className="size-4" /> Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Redirects to</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium break-all text-slate-700 dark:text-slate-300">{escapeHtml(r.originalUrl)}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleStartEdit(r)} title="Edit Destination">
                            <Edit2 className="size-4" />
                          </Button>
                        </div>
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
  );
}

