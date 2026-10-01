/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { BulkCsvData, QRConfig, QRType } from '@/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { useQRStoreSelector } from '@/context/QRContext';
import { generateQRSvg, rasterizeSvgToCanvas } from '@/packages/qr-export';
import { triggerFileDownload } from '@/utils/downloadManager';
import { FileSpreadsheet, Upload, AlertTriangle, Loader2 } from 'lucide-react';

export interface BulkCsvInputProps {
  data: BulkCsvData;
  onChange: (updates: Partial<BulkCsvData>) => void;
}

interface ParsedRow {
  [key: string]: string;
}

interface RowError {
  rowIndex: number;
  message: string;
}

/**
 * Utility to convert an offscreen canvas to a Uint8Array PNG buffer.
 * Falls back to base64 decoding for test/jsdom environments where toBlob may return null.
 */
async function canvasToUint8Array(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, 'image/png');
    } catch {
      resolve(null);
    }
  });

  if (blob) {
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  const dataUrl = canvas.toDataURL('image/png');
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;
  const binaryString = typeof window !== 'undefined' && window.atob
    ? window.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Sanitizes filenames to prevent illegal filesystem characters.
 */
function sanitizeFilename(name: string): string {
  const sanitized = name.replace(/[\\/?:*"><|]/g, '_').trim();
  return sanitized.length > 0 ? sanitized : 'qr_code';
}

export const BulkCsvInput: React.FC<BulkCsvInputProps> = ({ data, onChange }) => {
  const currentConfig = useQRStoreSelector((state) => state.config);
  const { addToast } = useToast();

  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Parse CSV when data.csvContent changes
  useEffect(() => {
    if (!data.csvContent) {
      setColumns([]);
      setRows([]);
      setRowErrors([]);
      return;
    }

    const parseResults = Papa.parse<ParsedRow>(data.csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
    });

    let detectedFields = parseResults.meta.fields || [];
    const parsedData = parseResults.data || [];

    // Fallback for files without standard headers
    if (detectedFields.length === 0 && parsedData.length > 0) {
      const firstRow = parsedData[0];
      if (firstRow && typeof firstRow === 'object') {
        detectedFields = Object.keys(firstRow);
      }
    }

    setColumns(detectedFields);
    setRows(parsedData);

    // Auto-select initial payload and filename columns if not set
    if (detectedFields.length > 0) {
      const defaultPayload =
        detectedFields.find((col) => /url|link|payload|data|qr/i.test(col)) || detectedFields[0];
      const defaultFilename =
        detectedFields.find((col) => /name|id|label|title|filename/i.test(col)) || detectedFields[0];

      if (!data.payloadColumn || !detectedFields.includes(data.payloadColumn)) {
        onChange({ payloadColumn: defaultPayload });
      }
      if (!data.filenameColumn || !detectedFields.includes(data.filenameColumn)) {
        onChange({ filenameColumn: defaultFilename });
      }
    }
  }, [data.csvContent, data.payloadColumn, data.filenameColumn, onChange]);

  // Validate rows when payload column or rows change
  const validateRows = useCallback(
    (parsedRows: ParsedRow[], payloadCol: string): RowError[] => {
      const errors: RowError[] = [];
      if (!payloadCol) return errors;

      parsedRows.forEach((row, index) => {
        const value = row[payloadCol];
        if (value === undefined || value === null || String(value).trim() === '') {
          errors.push({
            rowIndex: index + 1,
            message: `Row ${index + 1}: Empty value in payload column '${payloadCol}'`,
          });
        }
      });
      return errors;
    },
    []
  );

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onChange({
        csvContent: content,
        fileName: file.name,
      });
      addToast({
        type: 'success',
        message: `Successfully loaded ${file.name}`,
        duration: 3000,
      });
    };
    reader.onerror = () => {
      addToast({
        type: 'error',
        message: `Failed to read file ${file.name}`,
        duration: 5000,
      });
    };
    reader.readAsText(file);
  };

  const startBatchGeneration = async (validRowsOnly = false) => {
    const payloadCol = data.payloadColumn || columns[0];
    const filenameCol = data.filenameColumn || columns[0];
    const exportFormat = data.exportFormat || 'png';

    if (!payloadCol) {
      addToast({
        type: 'error',
        message: 'Please select a payload column before generating batch.',
        duration: 4000,
      });
      return;
    }

    // Check for row errors if not already filtered
    const currentErrors = validateRows(rows, payloadCol);
    if (!validRowsOnly && currentErrors.length > 0) {
      setRowErrors(currentErrors);
      setShowErrorModal(true);
      return;
    }

    // Filter target rows
    const targetRows = validRowsOnly
      ? rows.filter((row) => row[payloadCol] && String(row[payloadCol]).trim() !== '')
      : rows;

    if (targetRows.length === 0) {
      addToast({
        type: 'error',
        message: 'No valid rows found to generate QR codes.',
        duration: 4000,
      });
      return;
    }

    setIsGenerating(true);
    setCompletedCount(0);
    setTotalCount(targetRows.length);

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const usedFilenames = new Set<string>();

      for (let i = 0; i < targetRows.length; i++) {
        const row = targetRows[i];
        const rawPayload = String(row[payloadCol] || '').trim();
        const rawFilename = String(row[filenameCol] || `qr_${i + 1}`).trim();

        const baseName = sanitizeFilename(rawFilename);
        let finalFilename = `${baseName}.${exportFormat}`;
        let dupCount = 1;
        while (usedFilenames.has(finalFilename)) {
          finalFilename = `${baseName}_${dupCount}.${exportFormat}`;
          dupCount++;
        }
        usedFilenames.add(finalFilename);

        // Build QR config for row
        const rowConfig: QRConfig = {
          ...currentConfig,
          value: rawPayload,
          type: QRType.URL,
        };

        const svgString = await generateQRSvg(rowConfig);

        if (exportFormat === 'svg') {
          zip.file(finalFilename, svgString);
        } else {
          const canvas = await rasterizeSvgToCanvas(svgString, 1000, 1000);
          const uint8 = await canvasToUint8Array(canvas);
          zip.file(finalFilename, uint8);
        }

        setCompletedCount(i + 1);

        // Yield to main thread briefly for UI/progress updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const zipBytes = await zip.generateAsync({ type: 'uint8array' });
      const zipFileName = data.fileName
        ? `${data.fileName.replace(/\.[^/.]+$/, '')}-qrcodes.zip`
        : 'qr-codes-batch.zip';

      triggerFileDownload(zipBytes, zipFileName, 'application/zip');

      addToast({
        type: 'success',
        message: `Generated and downloaded ZIP with ${targetRows.length} QR codes!`,
        duration: 5000,
      });
    } catch (err) {
      console.error('Batch generation failed:', err);
      addToast({
        type: 'error',
        message: 'Failed to generate batch QR codes. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
      setShowErrorModal(false);
    }
  };

  const detectedPayloadDefault = columns.find((col) => /url|link|payload|data|qr/i.test(col)) || columns[0] || '';
  const detectedFilenameDefault = columns.find((col) => /name|id|label|title|filename/i.test(col)) || columns[0] || '';

  const payloadCol = data.payloadColumn || detectedPayloadDefault;
  const filenameCol = data.filenameColumn || detectedFilenameDefault;
  const exportFormat = data.exportFormat || 'png';
  const rowCount = rows.length;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {!data.csvContent ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <FileSpreadsheet className="size-12 text-teal-600 dark:text-teal-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            Upload CSV or TXT File
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Upload a `.csv` or `.txt` file with up to 100 rows for bulk QR code generation.
          </p>
          <label className="mt-4 cursor-pointer">
            <span className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus:ring-2 focus:ring-teal-500 focus:outline-hidden">
              <Upload className="size-4" />
              Choose File
            </span>
            <input
              type="file"
              aria-label="Upload CSV or TXT file"
              accept=".csv, .txt, text/csv, text/plain"
              className="sr-only"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="size-5 text-teal-600 dark:text-teal-400" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {data.fileName || 'Uploaded CSV'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {rowCount} rows found • {columns.length} columns detected
                </p>
              </div>
            </div>
            <label className="cursor-pointer text-xs font-medium text-teal-700 hover:underline dark:text-teal-400">
              Change File
              <input
                type="file"
                aria-label="Change CSV or TXT file"
                accept=".csv, .txt, text/csv, text/plain"
                className="sr-only"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Warning Banner for >100 rows */}
          {rowCount > 100 && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Main Thread Processing Warning</p>
                <p className="mt-0.5">
                  This CSV file contains {rowCount} rows (exceeding 100 rows). Processing large
                  batches directly in the browser may cause brief UI unresponsiveness.
                </p>
              </div>
            </div>
          )}

          {/* Column Mappings & Options */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="bulk-payload-column"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Payload Column (QR Content)
              </label>
              <select
                id="bulk-payload-column"
                value={payloadCol}
                onChange={(e) => onChange({ payloadColumn: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bulk-filename-column"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Filename Column
              </label>
              <select
                id="bulk-filename-column"
                value={filenameCol}
                onChange={(e) => onChange({ filenameColumn: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bulk-export-format"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Image Format
              </label>
              <select
                id="bulk-export-format"
                value={exportFormat}
                onChange={(e) =>
                  onChange({ exportFormat: e.target.value as 'png' | 'svg' })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="png">PNG Vector/Raster</option>
                <option value="svg">SVG Vector Image</option>
              </select>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => startBatchGeneration(false)}
              disabled={isGenerating || rowCount === 0}
              className="flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating Batch ZIP...
                </>
              ) : (
                'Generate Batch'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Malformed Row Error Dialog */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="CSV Row Validation Errors"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" />
            Found {rowErrors.length} row(s) with missing payload values:
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-100 p-3 font-mono text-xs dark:bg-slate-800">
            {rowErrors.map((err, idx) => (
              <p key={idx} className="text-rose-600 dark:text-rose-400">
                {err.message}
              </p>
            ))}
          </div>
          <p className="text-xs">
            Would you like to skip these invalid rows and generate QR codes for the valid rows?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowErrorModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => startBatchGeneration(true)}
            >
              Skip Bad Rows & Continue
            </Button>
          </div>
        </div>
      </Modal>

      {/* Progress Dialog */}
      <Modal
        isOpen={isGenerating}
        onClose={() => {}}
        title="Generating Batch QR Codes"
      >
        <div className="space-y-4 py-2 text-center">
          <div className="flex justify-center">
            <Loader2 className="size-10 animate-spin text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-base font-semibold text-slate-900 dark:text-white" id="batch-progress-status">
            {completedCount} of {totalCount} QR codes generated
          </p>
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-2.5 rounded-full bg-teal-600 transition-all duration-300 dark:bg-teal-400"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
