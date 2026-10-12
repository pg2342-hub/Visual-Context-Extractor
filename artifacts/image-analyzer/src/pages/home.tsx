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
    <div className="min-h-[calc(100dvh-4.4rem)] text-[#203747]">
      <main className="mx-auto max-w-[1000px] px-4 pb-20 pt-12 sm:px-8 md:pt-[76px]">
        {/* Intro */}
        <div className="mx-auto mb-11 max-w-[660px] text-center">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.22em] text-[#5b94a7]">Image context extractor</p>
          <h2 className="mb-4 font-display text-[34px] font-semibold leading-[1.16] tracking-[-.055em] text-[#203747] sm:text-[46px]">
            Turn images into useful context.
          </h2>
          <p className="mx-auto max-w-[520px] text-[15px] leading-7 text-[#71838d] md:text-base">
            Extract observations, data, interface details, and code context from screenshots and other visuals.
          </p>
          {selectedProject && (
            <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-[#d5e8ed] bg-white/75 px-3.5 py-1.5 text-[12px] font-medium text-[#537482] shadow-[0_3px_12px_rgba(51,94,112,.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#61a2b6]" /> Project context <span className="font-semibold text-[#315b6c]">{selectedProject.name}</span>
            </p>
          )}
        </div>

          <div className="flex flex-col gap-7">
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
                <Alert variant="destructive" className="border-[#efd6d3] bg-[#fff8f7] text-[#843c38] shadow-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold">Analysis Failed</AlertTitle>
                  <AlertDescription className="mt-1 text-[#9d5c56]">
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
