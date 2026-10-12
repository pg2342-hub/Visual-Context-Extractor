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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Extraction Mode</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => onModeChange(m.value)}
              disabled={isAnalyzing}
              className={cn(
                'flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all duration-200',
                mode === m.value
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                isAnalyzing && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="text-sm font-semibold">{m.label}</span>
              <span className="text-xs text-slate-400 leading-tight">{m.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Image drop zone or thumbnails */}
      {selectedFiles.length === 0 ? (
        <div
          {...getRootProps()}
          className={cn(
            'w-full relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center p-12 min-h-[260px] bg-white hover:bg-slate-50',
            isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-200 hover:border-primary/40'
          )}
        >
          <input {...getInputProps()} />
          <div className={cn(
            'p-4 rounded-full mb-4 transition-all duration-300',
            isDragActive ? 'bg-primary/20 text-primary scale-110' : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'
          )}>
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Upload images</h3>
          <p className="text-sm text-slate-500 text-center max-w-[260px]">
            Drag & drop, click to browse, or paste from clipboard. Multiple images supported.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-400">
            {['JPEG', 'PNG', 'WEBP', 'GIF'].map(t => (
              <span key={t} className="px-2 py-1 rounded bg-slate-100">{t}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Thumbnail grid */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {selectedFiles.map((file, idx) => {
              const url = URL.createObjectURL(file);
              return (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
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
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
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
                className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-slate-50 transition-all group"
              >
                <input {...getInputProps()} />
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                <span className="text-xs text-slate-400 group-hover:text-primary mt-1 transition-colors">Add more</span>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-slate-700">{selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''}</span>
              <span>·</span>
              <span className="text-primary font-medium">{selectedMode.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {!isAnalyzing && (
                <button
                  onClick={onClearAll}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded hover:bg-red-50"
                >
                  Clear all
                </button>
              )}
              <Button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="gap-2 font-semibold shadow-sm"
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
