import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Zap, Plus, BarChart2, Code2, Network } from 'lucide-react';
import { cn, isValidImageType } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { AnalysisMode } from '@/hooks/use-analyze';

const MODES: { value: AnalysisMode; label: string; description: string }[] = [
  { value: 'summarize', label: 'Summarize', description: 'General summary & key observations' },
  { value: 'extract_data_points', label: 'Extract Data Points', description: 'Tables, charts & graphs' },
  { value: 'identify_ui_elements', label: 'Identify UI Elements', description: 'Map UI components & layout' },
  { value: 'describe_code', label: 'Describe Code', description: 'Explain & solve code problems' },
  { value: 'system_design', label: 'System Design', description: 'Understand client systems & integrations' },
];

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveImage: (index: number) => void;
  onClearAll: () => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
}

export function ImageUploader({
  onImagesSelected,
  selectedFiles,
  onRemoveImage,
  onClearAll,
  isAnalyzing,
  onAnalyze,
  mode,
  onModeChange,
}: ImageUploaderProps) {
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const valid = acceptedFiles.filter(isValidImageType);
    const invalid = acceptedFiles.filter(f => !isValidImageType(f));
    if (invalid.length > 0) {
      toast({
        title: 'Unsupported file type',
        description: 'Only JPEG, PNG, WEBP, and GIF images are supported.',
        variant: 'destructive',
      });
    }
    if (valid.length > 0) onImagesSelected(valid);
  }, [onImagesSelected, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    multiple: true,
    disabled: isAnalyzing,
  });

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;
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

  const selectedMode = MODES.find(m => m.value === mode)!;

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Mode selector */}
      <div className="rounded-[20px] border border-[#dfeaec] bg-white/80 p-4 shadow-[0_12px_32px_rgba(39,75,95,0.045)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#79909a]">Choose an extraction lens</p>
          <span className="hidden text-xs text-[#9aabb1] sm:block">One image, five useful ways to read it</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => onModeChange(m.value)}
              disabled={isAnalyzing}
              className={cn(
                'flex min-h-[88px] flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-all duration-200',
                mode === m.value
                  ? 'border-[#9fc8d4] bg-[#f0f8fa] text-[#286c85] shadow-[inset_0_0_0_1px_rgba(96,158,178,.08)]'
                  : 'border-[#e6edef] text-[#647780] hover:border-[#c5dce2] hover:bg-[#f8fbfc]',
                isAnalyzing && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="text-[13px] font-semibold leading-tight">{m.label}</span>
              <span className="text-[11px] leading-[1.45] text-[#8798a0]">{m.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Image drop zone or thumbnails */}
      {selectedFiles.length === 0 ? (
        <div
          {...getRootProps()}
          className={cn(
            'group relative flex min-h-[260px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border border-dashed bg-white/75 p-8 transition-all duration-300 hover:bg-[#f9fcfd] sm:p-12',
            isDragActive ? 'border-[#72afc2] bg-[#eef8fa] scale-[1.005]' : 'border-[#c9dce1] hover:border-[#84b7c6]'
          )}
        >
          <input {...getInputProps()} />
          <div className={cn(
            'mb-4 grid h-14 w-14 place-items-center rounded-2xl transition-all duration-300',
            isDragActive ? 'bg-[#d7edf2] text-[#347f9d] scale-105' : 'bg-[#edf6f8] text-[#6e9cab] group-hover:bg-[#e3f2f5] group-hover:text-[#347f9d]'
          )}>
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold tracking-[-.03em] text-[#2c4654]">Add screenshots to inspect</h3>
          <p className="max-w-[330px] text-center text-[13px] leading-6 text-[#7a8b93]">
            Drop files here, browse your device, or paste directly from your clipboard. Multiple images are supported.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-400">
            {['JPEG', 'PNG', 'WEBP', 'GIF'].map(t => (
            <span key={t} className="rounded-md border border-[#e4edef] bg-[#f7fafb] px-2 py-1">{t}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-[#dfeaec] bg-white/85 shadow-[0_12px_32px_rgba(39,75,95,0.045)]">
          {/* Thumbnail grid */}
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 sm:p-5">
            {selectedFiles.map((file, idx) => {
              const url = URL.createObjectURL(file);
              return (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-[#dce8eb] bg-[#f0f5f6]">
                  <img
                    src={url}
                    alt={file.name}
                    className={cn(
                      'w-full h-full object-cover transition-opacity',
                      isAnalyzing ? 'opacity-50' : 'opacity-100'
                    )}
                  />
                  {/* Scanning overlay on the first image */}
                  {isAnalyzing && idx === 0 && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="w-full h-12 bg-gradient-to-b from-transparent via-primary/30 to-primary/50 animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                  )}
                  {!isAnalyzing && (
                    <button
                      onClick={() => onRemoveImage(idx)}
                      aria-label={`Remove ${file.name}`}
                      className="absolute right-2 top-2 rounded-full bg-[#294654]/75 p-2 text-white opacity-0 transition-opacity hover:bg-[#294654] group-hover:opacity-100 focus:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                    <p className="text-xs text-white/90 truncate">{file.name}</p>
                  </div>
                </div>
              );
            })}

            {/* Add more button */}
            {!isAnalyzing && (
              <div
                {...getRootProps()}
                className="group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#cadde2] transition-all hover:border-[#86b9c8] hover:bg-[#f6fbfc]"
              >
                <input {...getInputProps()} />
                <Plus className="h-6 w-6 text-[#91a6ae] transition-colors group-hover:text-[#347f9d]" />
                <span className="mt-1 text-xs text-[#91a6ae] transition-colors group-hover:text-[#347f9d]">Add more</span>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-3 border-t border-[#e8eff1] bg-[#f9fbfc] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-[13px] text-[#82939a]">
              <span className="font-medium text-[#526973]">{selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''}</span>
              <span>·</span>
              <span className="font-medium text-[#347f9d]">{selectedMode.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {!isAnalyzing && (
                <button
                  onClick={onClearAll}
                  className="rounded px-2 py-1.5 text-xs text-[#83939a] transition-colors hover:bg-[#fff2f0] hover:text-[#a44f49]"
                >
                  Clear all
                </button>
              )}
              <Button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="gap-2 rounded-lg bg-[#347f9d] font-semibold text-white shadow-[0_4px_12px_rgba(52,127,157,.18)] hover:bg-[#286d88]"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : mode === 'extract_data_points' ? (
                  <>
                    <BarChart2 className="w-4 h-4" />
                    Extract Data
                  </>
                ) : mode === 'describe_code' ? (
                  <>
                    <Code2 className="w-4 h-4" />
                    Analyze Code
                  </>
                ) : mode === 'system_design' ? (
                  <>
                    <Network className="w-4 h-4" />
                    Map System
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
