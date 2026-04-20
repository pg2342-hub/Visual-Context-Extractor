import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanSearch, AlertCircle } from 'lucide-react';
import { ImageUploader } from '@/components/image-uploader';
import { AnalysisResults } from '@/components/analysis-results';
import { useAnalyzeImage, type AnalysisMode } from '@/hooks/use-analyze';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isValidImageType } from '@/lib/utils';

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<AnalysisMode>('summarize');

  const analyzeMutation = useAnalyzeImage();

  const handleImagesSelected = (files: File[]) => {
    setSelectedFiles(prev => {
      const all = [...prev, ...files.filter(isValidImageType)];
      // Deduplicate by name+size
      const seen = new Set<string>();
      return all.filter(f => {
        const key = `${f.name}-${f.size}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    analyzeMutation.reset();
  };

  const handleRemoveImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    analyzeMutation.reset();
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    analyzeMutation.reset();
  };

  const handleModeChange = (newMode: AnalysisMode) => {
    setMode(newMode);
    analyzeMutation.reset();
  };

  const handleAnalyze = () => {
    if (selectedFiles.length > 0) {
      analyzeMutation.mutate({ files: selectedFiles, mode });
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <ScanSearch className="w-4 h-4" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-900">
            Image Context Extractor
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-10 max-w-4xl">
        {/* Intro */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-slate-900">
            Understand any image instantly.
          </h2>
          <p className="text-slate-500 md:text-lg">
            Upload one or more images, pick an extraction mode, and let me do the rest.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Uploader + mode selector */}
          <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <ImageUploader
              selectedFiles={selectedFiles}
              onImagesSelected={handleImagesSelected}
              onRemoveImage={handleRemoveImage}
              onClearAll={handleClearAll}
              isAnalyzing={analyzeMutation.isPending}
              onAnalyze={handleAnalyze}
              mode={mode}
              onModeChange={handleModeChange}
            />
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {analyzeMutation.isError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900 shadow-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold">Analysis Failed</AlertTitle>
                  <AlertDescription className="text-red-700/80 mt-1">
                    {analyzeMutation.error.message}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence mode="wait">
            {analyzeMutation.isSuccess && analyzeMutation.data && (
              <motion.div
                key={`results-${mode}`}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <AnalysisResults data={analyzeMutation.data} mode={mode} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
