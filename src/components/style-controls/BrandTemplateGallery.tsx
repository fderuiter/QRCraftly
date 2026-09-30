import React, { useState, useEffect } from 'react';
import { BookmarkPlus, Download, Upload, Trash2, Edit3, Check, Sparkles } from 'lucide-react';
import { QRConfig, BrandTemplate } from '../../types';
import { PREBUILT_TEMPLATES } from '../../data/brandTemplates';
import {
  getStoredTemplates,
  saveCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  validateTemplateJson,
  exportTemplateToJson,
  applyTemplateToConfig,
  MAX_CUSTOM_TEMPLATES,
} from '../../utils/brandTemplateManager';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TextField } from '../ui/TextField';

interface BrandTemplateGalleryProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const BrandTemplateGallery: React.FC<BrandTemplateGalleryProps> = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customTemplates, setCustomTemplates] = useState<BrandTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal states
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setCustomTemplates(getStoredTemplates());
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleApply = (template: BrandTemplate) => {
    const styleUpdates = applyTemplateToConfig(config, template.config);
    onChange(styleUpdates);
    setSelectedId(template.id);
    showFeedback(`Applied "${template.name}" theme.`);
  };

  const handleOpenSaveModal = () => {
    setSaveName('');
    setSaveDescription('');
    setSaveError(null);
    setIsSaveModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const result = saveCustomTemplate(saveName, saveDescription, config);
    if (!result.success) {
      setSaveError(result.error || 'Failed to save template.');
      return;
    }
    setCustomTemplates(getStoredTemplates());
    setIsSaveModalOpen(false);
    if (result.template) {
      setSelectedId(result.template.id);
    }
    setActiveTab('custom');
    showFeedback(`Saved "${saveName}" to custom templates!`);
  };

  const handleOpenRenameModal = (template: BrandTemplate) => {
    setRenameId(template.id);
    setRenameName(template.name);
    setRenameError(null);
    setIsRenameModalOpen(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameId) return;
    setRenameError(null);
    const result = updateCustomTemplate(renameId, { name: renameName });
    if (!result.success) {
      setRenameError(result.error || 'Failed to rename template.');
      return;
    }
    setCustomTemplates(getStoredTemplates());
    setIsRenameModalOpen(false);
    setRenameId(null);
    showFeedback('Template renamed.');
  };

  const handleDelete = (template: BrandTemplate) => {
    const success = deleteCustomTemplate(template.id);
    if (success) {
      setCustomTemplates(getStoredTemplates());
      if (selectedId === template.id) setSelectedId(null);
      showFeedback(`Deleted "${template.name}".`);
    }
  };

  const handleExport = (template: BrandTemplate) => {
    exportTemplateToJson(template);
    showFeedback(`Exported "${template.name}" to JSON.`);
  };

  const processImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const parsed = JSON.parse(rawText);
        const validation = validateTemplateJson(parsed);

        if (!validation.valid || !validation.template) {
          showFeedback(validation.error || 'Invalid template JSON file.', 'error');
          return;
        }

        if (customTemplates.length >= MAX_CUSTOM_TEMPLATES) {
          showFeedback(`Storage quota reached (${MAX_CUSTOM_TEMPLATES} templates max).`, 'error');
          return;
        }

        const stored = getStoredTemplates();
        const updated = [validation.template, ...stored];
        localStorage.setItem('qrcraftly:brand-templates', JSON.stringify(updated));
        setCustomTemplates(updated);
        setActiveTab('custom');
        setSelectedId(validation.template.id);
        showFeedback(`Imported template "${validation.template.name}"!`);
      } catch {
        showFeedback('Could not parse JSON file. Please ensure it is a valid template file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        processImportFile(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenSaveModal}
          className="gap-1.5"
          aria-label="Save current visual settings as brand template"
        >
          <BookmarkPlus className="size-4" />
          <span>Save as Template</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
          className="gap-1.5"
          aria-label="Import template from JSON file"
        >
          <Upload className="size-4" />
          <span>Import JSON</span>
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
              : 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'presets'}
          onClick={() => setActiveTab('presets')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'presets'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Curated Presets ({PREBUILT_TEMPLATES.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'custom'}
          onClick={() => setActiveTab('custom')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'custom'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          My Templates ({customTemplates.length}/{MAX_CUSTOM_TEMPLATES})
        </button>
      </div>

      {/* Gallery Cards Container */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(activeTab === 'presets' ? PREBUILT_TEMPLATES : customTemplates).map((template) => {
          const isSelected = selectedId === template.id;
          const bg = template.config.bgColor || '#ffffff';
          const fg = template.config.fgColor || '#000000';
          const eye = template.config.eyeColor || fg;
          const borderColor = template.config.borderColor || fg;
          const hasBorder = template.config.isBorderEnabled;

          return (
            <div
              key={template.id}
              className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all ${
                isSelected
                  ? 'border-teal-600 bg-teal-50/30 ring-2 ring-teal-600 dark:border-teal-400 dark:bg-teal-950/20 dark:ring-teal-400'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
              }`}
            >
              {/* Card Top: Swatch & Info */}
              <div className="flex items-start gap-3">
                {/* Visual Swatch */}
                <div
                  className="relative flex size-12 shrink-0 items-center justify-center rounded-lg border shadow-xs transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: bg,
                    borderColor: hasBorder ? borderColor : 'rgba(0,0,0,0.1)',
                    borderStyle: hasBorder ? template.config.borderStyle || 'solid' : 'solid',
                  }}
                  title={`Fg: ${fg}, Bg: ${bg}`}
                >
                  <div
                    className="flex size-7 flex-col justify-between rounded-sm p-0.5"
                    style={{ backgroundColor: fg }}
                  >
                    <div className="flex justify-between">
                      <div className="rounded-2xs size-1.5" style={{ backgroundColor: eye }} />
                      <div className="rounded-2xs size-1.5" style={{ backgroundColor: eye }} />
                    </div>
                    <div className="flex justify-start">
                      <div className="rounded-2xs size-1.5" style={{ backgroundColor: eye }} />
                    </div>
                  </div>
                </div>

                {/* Name & Metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {template.name}
                    </h4>
                    {isSelected && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                        <Check className="size-2.5" /> Active
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {template.description}
                    </p>
                  )}
                  <span className="mt-1 inline-block text-[10px] tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    {template.config.style || 'standard'}
                  </span>
                </div>
              </div>

              {/* Card Bottom: Actions */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApply(template)}
                  className="text-xs"
                  aria-label={`Apply ${template.name} template`}
                >
                  Apply
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExport(template)}
                    title="Export JSON"
                    aria-label={`Export ${template.name} as JSON`}
                  >
                    <Download className="size-3.5" />
                  </Button>

                  {!template.isPrebuilt && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenRenameModal(template)}
                        title="Rename Template"
                        aria-label={`Rename ${template.name}`}
                      >
                        <Edit3 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template)}
                        title="Delete Template"
                        aria-label={`Delete ${template.name}`}
                        className="text-rose-500 hover:text-rose-700 dark:text-rose-400"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {activeTab === 'custom' && customTemplates.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
            <Sparkles className="mx-auto size-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              No custom templates saved yet.
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Customize colors, patterns, and borders, then click "Save as Template" or import a team JSON file.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSaveModal}
              className="mt-3"
            >
              Save Current Style
            </Button>
          </div>
        )}
      </div>

      {/* Save Template Modal */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Brand Template"
      >
        <form onSubmit={handleSaveSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Save your active visual settings (colors, pattern style, borders, logo configuration) as a reusable template.
          </p>

          <TextField
            label="Template Name"
            placeholder="e.g. Acme Corporate Teal"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            maxLength={100}
            required
          />

          <div>
            <label htmlFor="template-description-input" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <textarea
              id="template-description-input"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 transition-colors focus:border-teal-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-400"
              rows={2}
              placeholder="e.g. Official brand colors for marketing campaigns"
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              maxLength={200}
            />
          </div>

          {saveError && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
              {saveError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Template Modal */}
      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title="Rename Template"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <TextField
            label="Template Name"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            maxLength={100}
            required
          />

          {renameError && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
              {renameError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Update Name
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
