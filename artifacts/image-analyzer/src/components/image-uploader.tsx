import { useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, Plus, X } from 'lucide-react';
import type { ProjectFinding } from '@workspace/api-client-react';
import { cn, isValidImageType } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/marks';
import { MarkedImage } from '@/components/marked-image';
import type { AnalysisMode } from '@/hooks/use-analyze';

export const MODES: { value: AnalysisMode; label: string; short: string; description: string; action: string }[] = [
  { value: 'summarize', label: 'Summarize', short: 'Summarize', description: 'Key observations and the context around them.', action: 'Summarize' },
  { value: 'extract_data_points', label: 'Data points', short: 'Data', description: 'Every value in a chart or table, with labels, units and axes.', action: 'Extract data' },
  { value: 'identify_ui_elements', label: 'UI elements', short: 'UI', description: 'Each element on screen with its type, location, purpose and state.', action: 'Map interface' },
  { value: 'describe_code', label: 'Code', short: 'Code', description: 'What the code does, its issues, and a corrected version.', action: 'Read code' },
  { value: 'system_design', label: 'System design', short: 'Systems', description: 'Systems, integrations, data flows, risks and questions for the client.', action: 'Map systems' },
];

export function LensPicker({ mode, onModeChange, disabled }: { mode: AnalysisMode; onModeChange: (mode: AnalysisMode) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Lens" className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line-2 bg-surface p-[3px]">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={mode === m.value}
          disabled={disabled}
          onClick={() => onModeChange(m.value)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            mode === m.value ? 'bg-subtle text-ink' : 'text-ink-2 hover:text-ink',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveImage: (index: number) => void;
  onClearAll: () => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  mode: AnalysisMode;
  findings?: ProjectFinding[];
  activeFinding?: number | null;
  onFocusFinding?: (id: number | null) => void;
}

export function ImageUploader({
  onImagesSelected,
  selectedFiles,
  onRemoveImage,
  onClearAll,
  isAnalyzing,
  onAnalyze,
  mode,
  findings = [],
  activeFinding = null,
  onFocusFinding,
}: ImageUploaderProps) {
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const valid = acceptedFiles.filter(isValidImageType);
    if (acceptedFiles.length > valid.length) {
      toast({
        title: 'Some files were skipped',
        description: 'Only JPEG, PNG, WebP and GIF images can be analyzed.',
        variant: 'destructive',
      });
    }
    if (valid.length > 0) onImagesSelected(valid);
  }, [onImagesSelected, toast]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    multiple: true,
    disabled: isAnalyzing,
    noClick: selectedFiles.length > 0,
    noKeyboard: selectedFiles.length > 0,
  });

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file && isValidImageType(file)) files.push(file);
        }
      }
      if (files.length > 0) onImagesSelected(files);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImagesSelected, isAnalyzing]);

  const urls = useMemo(() => selectedFiles.map((file) => URL.createObjectURL(file)), [selectedFiles]);
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);

  const selectedMode = MODES.find((m) => m.value === mode)!;
  const single = selectedFiles.length === 1;

  return (
    <section
      {...getRootProps()}
      aria-label="Images to analyze"
      className={cn(
        'relative overflow-hidden rounded-xl border bg-surface shadow-card outline-none transition-colors',
        isDragActive ? 'border-fact' : 'border-line',
      )}
    >
      <input {...getInputProps()} aria-label="Choose images" />

      {selectedFiles.length === 0 ? (
        <div className={cn('dot-grid flex min-h-[420px] cursor-pointer flex-col items-center justify-center px-6 py-14 text-center', isDragActive && 'bg-fact-bg')}>
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-full border border-line-2 bg-surface text-ink shadow-card">
            <ImagePlus className="h-5 w-5" />
          </span>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
            {isDragActive ? 'Drop to add these images' : 'Drop screenshots or diagrams here'}
          </h2>
          <p className="mt-1.5 max-w-[26rem] text-[14px] text-ink-2">
            Or paste from your clipboard with <kbd className="rounded border border-line-2 bg-subtle px-1 font-mono text-[12px] text-ink">⌘V</kbd>. Add several at once to read them together.
          </p>
          <span className="mt-6 inline-flex h-9 items-center rounded-md border border-line-2 bg-surface px-4 text-[14px] font-medium text-ink transition-colors hover:bg-subtle">
            Browse files
          </span>
          <p className="mt-4 font-mono text-[12px] text-ink-3">PNG · JPEG · WebP · GIF</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="text-[13px] text-ink-2">
              {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''}
            </span>
            <span className="ml-auto flex items-center gap-1">
              {!isAnalyzing && (
                <>
                  <button type="button" onClick={open} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink">
                    <Plus className="h-4 w-4" /> Add images
                  </button>
                  <button type="button" onClick={onClearAll} className="inline-flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink">
                    Clear
                  </button>
                </>
              )}
            </span>
          </div>

          <div className={cn('dot-grid grid gap-4 p-4 sm:p-5', single ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}>
            {selectedFiles.map((file, idx) => {
              const ref = `IMG-${idx + 1}`;
              const cited = findings.map((finding, i) => ({ finding, n: i + 1 })).filter(({ finding }) => finding.sourceRefs.includes(ref));
              const lit = cited.some(({ finding }) => finding.id === activeFinding);
              return (
                <figure
                  key={`${file.name}-${file.size}-${idx}`}
                  className={cn(
                    'group relative m-0 overflow-hidden rounded-lg border bg-surface transition-[border-color,box-shadow] duration-200',
                    lit ? 'border-fact ring-2 ring-fact/25' : 'border-line-2',
                  )}
                >
                  <div className={cn('relative flex items-center justify-center bg-subtle', single ? 'max-h-[560px] min-h-[280px]' : 'aspect-[4/3]')}>
                    <MarkedImage
                      src={urls[idx]}
                      alt={file.name}
                      imageRef={ref}
                      findings={cited}
                      active={activeFinding !== null ? [activeFinding] : []}
                      dimmed={isAnalyzing}
                      onFocusFinding={onFocusFinding}
                      className={single ? 'w-full' : 'h-full w-full'}
                      imgClassName={cn('block w-full object-contain', single ? 'max-h-[560px]' : 'h-full')}
                    />
                    {isAnalyzing && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute inset-x-0 h-24 animate-[scan_1.8s_cubic-bezier(.16,1,.3,1)_infinite] bg-gradient-to-b from-transparent to-fact/15" />
                      </div>
                    )}
                  </div>
                  <figcaption className="flex items-center gap-2 border-t border-line px-3 py-2">
                    <span className="rounded-full border border-line-2 px-2 font-mono text-[11.5px] leading-5 text-ink">{ref}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{file.name}</span>
                    {!isAnalyzing && (
                      <button
                        type="button"
                        onClick={() => onRemoveImage(idx)}
                        aria-label={`Remove ${file.name}`}
                        className="grid h-6 w-6 place-items-center rounded-md text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </figcaption>
                </figure>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-4 py-3">
            <p className="text-[13px] text-ink-2">
              Lens: <span className="font-medium text-ink">{selectedMode.label}</span>
            </p>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[14px] font-medium text-surface transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Reading {selectedFiles.length > 1 ? 'images' : 'image'}…
                </>
              ) : (
                selectedMode.action
              )}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
