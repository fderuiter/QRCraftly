import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Edit2, Save, ExternalLink, QrCode, RefreshCw, X } from 'lucide-react';
import { useRedirector, DynamicQRRecord } from '@/hooks/useRedirector';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/FormFields';
import { isDangerousUrl, sanitizeHref, escapeHtml } from '@/utils/security';
import { normalizeUrl } from '@/utils/url';

/**
 * Dynamic Redirection Dashboard Component.
 * Enables listing, tracking stats, and updating target destinations for dynamic QR codes from local storage.
 * @returns The rendered DynamicDashboardPage component.
 */
export default function DynamicDashboardPage() {
  const { records, updateRedirect, fetchStats, deleteRecord } = useRedirector();
  const { addToast } = useToast();
  
  const [stats, setStats] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrlValue, setEditUrlValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const refreshStats = async (id: string) => {
    setRefreshing(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetchStats(id);
      if (res) {
        setStats(prev => ({ ...prev, [id]: res.scans }));
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
            const currentScans = stats[r.id] ?? 0;
            const isRefreshing = refreshing[r.id] ?? false;

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
                        <a href={sanitizeHref(r.redirectUrl)} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 dark:text-teal-400" title="Visit redirector">
                          <ExternalLink className="size-4" />
                        </a>
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
                      <a href={`/?value=${encodeURIComponent(r.redirectUrl)}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <QrCode className="size-4" /> Designer
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20" title="Delete Link">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
