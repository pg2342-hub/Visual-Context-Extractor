import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon, X, Zap } from 'lucide-react';
import { cn, isValidImageType } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export function ImageUploader({ 
  onImageSelected, 
  selectedFile, 
  onClear,
  isAnalyzing,
  onAnalyze
}: ImageUploaderProps) {
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (isValidImageType(file)) {
        onImageSelected(file);
      } else {
        toast({
          title: "Unsupported file type",
          description: "Please upload a JPEG, PNG, WEBP, or GIF image.",
          variant: "destructive"
        });
      }
    }
  }, [onImageSelected, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif']
    },
    maxFiles: 1,
    disabled: isAnalyzing
  });

  // Handle global paste event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file && isValidImageType(file)) {
            onImageSelected(file);
            break; // Only take the first image
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImageSelected, isAnalyzing]);

  const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : null;

  return (
    <div className="w-full flex flex-col gap-6">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            "w-full relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ease-out cursor-pointer group flex flex-col items-center justify-center p-12 min-h-[300px] bg-white hover:bg-slate-50",
            isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-200 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 pointer-events-none" />
          
          <div className={cn(
            "p-4 rounded-full mb-4 transition-all duration-300",
            isDragActive ? "bg-primary/20 text-primary scale-110" : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            <UploadCloud className="w-8 h-8" />
          </div>
          
          <h3 className="text-xl font-display font-semibold text-slate-800 mb-2">
            Upload an image
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-[250px]">
            Drag & drop, click to browse, or paste an image from your clipboard.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-100">JPEG</span>
            <span className="px-2 py-1 rounded bg-slate-100">PNG</span>
            <span className="px-2 py-1 rounded bg-slate-100">WEBP</span>
          </div>
        </div>
      ) : (
        <div className="relative w-full rounded-2xl overflow-hidden glass-card">
          <div className="relative aspect-auto max-h-[500px] flex items-center justify-center bg-slate-100 overflow-hidden">
            {/* Image Preview */}
            <img 
              src={previewUrl!} 
              alt="Preview" 
              className={cn(
                "max-w-full max-h-[500px] object-contain transition-opacity duration-500",
                isAnalyzing ? "opacity-40" : "opacity-100"
              )} 
            />
            
            {/* Scanning Animation Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                <div className="w-full h-32 bg-gradient-to-b from-transparent via-primary/20 to-primary/40 animate-[scan_2s_ease-in-out_infinite] border-b-2 border-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
              </div>
            )}

            {/* Clear Button */}
            {!isAnalyzing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm text-slate-700 rounded-full hover:bg-white hover:text-destructive shadow-sm transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Action Bar */}
          <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-[300px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            <Button 
              onClick={onAnalyze} 
              disabled={isAnalyzing}
              className="gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Analyze Context
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
