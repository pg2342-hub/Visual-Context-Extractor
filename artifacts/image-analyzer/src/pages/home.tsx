import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { ImageUploader } from '@/components/image-uploader';
import { AnalysisResults } from '@/components/analysis-results';
import { useAnalyzeImage, type AnalysisMode } from '@/hooks/use-analyze';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isValidImageType } from '@/lib/utils';
import { useProjects } from '@/components/project-context';

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<AnalysisMode>('summarize');
  const { selectedProject } = useProjects();

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
      analyzeMutation.mutate({
        files: selectedFiles,
        mode,
        projectId: selectedProject?.id,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <main className="container mx-auto px-4 py-8 md:py-10 max-w-4xl">
        {/* Intro */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-slate-900">
            Understand any image instantly.
          </h2>
          <p className="text-slate-500 md:text-lg">
            Upload one or more images, pick an extraction mode, and let me do the rest.
          </p>
          {selectedProject && (
            <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800">
              Working in <span className="font-semibold">{selectedProject.name}</span>
            </p>
          )}
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
