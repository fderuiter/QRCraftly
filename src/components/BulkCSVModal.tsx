/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { QRConfig } from '@/types';
import { triggerFileDownload } from '@/utils/downloadManager';
import {
  parseCsv,
  CsvParseResult,
  connectBulkCsvWorker,
  BulkCsvWorkerHandle,
  BulkCsvFormat,
  sanitizeFilename,
} from '@/packages/bulk-csv';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface BulkCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: QRConfig;
}

export const BulkCSVModal: React.FC<BulkCSVModalProps> = ({ isOpen, onClose, config }) => {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvText, setCsvText] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);

  const [payloadColumn, setPayloadColumn] = useState<string>('');
  const [filenameColumn, setFilenameColumn] = useState<string>('__none__');
  const [format, setFormat] = useState<BulkCsvFormat>('svg');

  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState({ processed: 0, total: 0, currentFilename: '' });
  const [errorMessage, setErrorMessage] = useState<string>('');

  const workerHandleRef = useRef<BulkCsvWorkerHandle | null>(null);

  // Reset state when modal is opened or closed
  useEffect(() => {
    if (!isOpen) {
      if (workerHandleRef.current) {
        workerHandleRef.current.terminate();
        workerHandleRef.current = null;
      }
      setStatus('idle');
      setProgress({ processed: 0, total: 0, currentFilename: '' });
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      addToast({
        type: 'error',
        message: 'Please upload a valid CSV file (.csv).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || !text.trim()) {
        addToast({
          type: 'error',
          message: 'The selected CSV file is empty.',
        });
        return;
      }

      const res = parseCsv(text);
      if (res.headers.length === 0 || res.rows.length === 0) {
        addToast({
          type: 'error',
          message: 'Could not detect headers or data rows in the uploaded CSV.',
        });
        return;
      }

      setCsvText(text);
      setCsvFileName(file.name);
      setParsed(res);

      // Auto-detect payload column
      const detectedPayload =
        res.headers.find((h) => /url|link|payload|data|text/i.test(h)) || res.headers[0];
      setPayloadColumn(detectedPayload);

      // Auto-detect filename column
      const detectedFilename = res.headers.find((h) => /name|title|id|filename|label/i.test(h));
      setFilenameColumn(detectedFilename || '__none__');

      setStatus('idle');
      setErrorMessage('');
    };

    reader.onerror = () => {
      addToast({
        type: 'error',
        message: 'Failed to read CSV file.',
      });
    };

    reader.readAsText(file);
  };

  const startBatch = () => {
    if (!csvText || !parsed || !payloadColumn) {
      addToast({
        type: 'error',
        message: 'Please select a CSV payload column before starting.',
      });
      return;
    }

    setStatus('processing');
    setProgress({ processed: 0, total: parsed.rows.length, currentFilename: '' });
    setErrorMessage('');

    const worker = connectBulkCsvWorker();
    workerHandleRef.current = worker;

    worker.startBatch(
      csvText,
      config,
      {
        payloadColumn,
        filenameColumn: filenameColumn !== '__none__' ? filenameColumn : undefined,
        format,
        maxRows: 1000,
      },
      {
        onProgress: (processed, total, currentFilename) => {
          setProgress({ processed, total, currentFilename });
        },
        onComplete: (zipData, _filename, totalCount) => {
          setStatus('completed');
          const zipName = `${sanitizeFilename(csvFileName.replace(/\.csv$/i, ''))}_qrcodes.zip`;
          triggerFileDownload(zipData, zipName, 'application/zip');

          addToast({
            type: 'success',
            message: `Successfully generated ${totalCount} QR codes! ZIP archive downloaded.`,
            duration: 6000,
          });
        },
        onError: (err) => {
          setStatus('error');
          setErrorMessage(err);
          addToast({
            type: 'error',
            message: `Batch generation failed: ${err}`,
          });
        },
      }
    );
  };

  const cancelBatch = () => {
    if (workerHandleRef.current) {
      workerHandleRef.current.cancelBatch();
      workerHandleRef.current.terminate();
      workerHandleRef.current = null;
    }
    setStatus('idle');
    addToast({
      type: 'info',
      message: 'Batch processing cancelled.',
    });
  };

  const resetUpload = () => {
    if (workerHandleRef.current) {
      workerHandleRef.current.terminate();
      workerHandleRef.current = null;
    }
    setCsvText('');
    setCsvFileName('');
    setParsed(null);
    setStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const progressPercentage = progress.total > 0
    ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={status === 'processing' ? cancelBatch : onClose} title="Bulk CSV Batch Generator">
      <div className="space-y-6">
        {!parsed ? (
          /* Step 1: Upload CSV */
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <FileSpreadsheet className="mb-3 size-12 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <h3 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100">
              Upload CSV File
            </h3>
            <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
              Upload a CSV file containing up to 1,000 records to generate customized QR codes in bulk off-thread.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,text/csv"
              className="hidden"
              id="bulk-csv-upload-input"
            />
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="size-4" aria-hidden="true" />
              Choose CSV File
            </Button>
          </div>
        ) : (
          /* Step 2: Mapping & Processing */
          <div className="space-y-5">
            {/* CSV Info Banner */}
            <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileSpreadsheet className="size-5 shrink-0 text-teal-600 dark:text-teal-400" />
                <div className="truncate">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{csvFileName}</span>
                  <span className="ml-2 text-slate-500">
                    ({parsed.rows.length} {parsed.rows.length === 1 ? 'row' : 'rows'}, {parsed.headers.length} cols)
                  </span>
                </div>
              </div>
              {status !== 'processing' && (
                <Button variant="ghost" size="sm" onClick={resetUpload} title="Change file">
                  <RefreshCw className="size-3.5" />
                </Button>
              )}
            </div>

            {/* Column Configuration Controls */}
            {status !== 'processing' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="csv-payload-column" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    QR Content Payload Column <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="csv-payload-column"
                    value={payloadColumn}
                    onChange={(e) => setPayloadColumn(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-800 shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="csv-filename-column" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Filename Column (Optional)
                  </label>
                  <select
                    id="csv-filename-column"
                    value={filenameColumn}
                    onChange={(e) => setFilenameColumn(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-800 shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="__none__">Auto Numbered (qr_1, qr_2, ...)</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Output Format
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('svg')}
                      className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${
                        format === 'svg'
                          ? 'border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950 dark:text-teal-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      SVG (Vector)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('png')}
                      className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${
                        format === 'png'
                          ? 'border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950 dark:text-teal-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      PNG (Raster Image)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Display */}
            {status === 'processing' && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Generating QR Codes...</span>
                  <span>
                    {progress.processed} of {progress.total} ({progressPercentage}%)
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full bg-teal-600 transition-all duration-150 ease-out dark:bg-teal-400"
                    style={{ width: `${progressPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                {progress.currentFilename && (
                  <p className="truncate text-center text-[11px] text-slate-500 dark:text-slate-400">
                    Adding {progress.currentFilename}
                  </p>
                )}
              </div>
            )}

            {/* Error Display */}
            {status === 'error' && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="font-semibold">Generation Failed</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Success Display */}
            {status === 'completed' && (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>ZIP archive generated and download triggered successfully!</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              {status === 'processing' ? (
                <Button variant="outline" onClick={cancelBatch}>
                  Cancel Batch
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={onClose}>
                    Close
                  </Button>
                  <Button variant="primary" onClick={startBatch}>
                    {status === 'completed' ? 'Regenerate Batch' : 'Start Batch Creation'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
