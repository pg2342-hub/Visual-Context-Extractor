import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanSearch, AlertCircle } from 'lucide-react';
import { ImageUploader } from '@/components/image-uploader';
import { AnalysisResults } from '@/components/analysis-results';
import { useAnalyzeImage } from '@/hooks/use-analyze';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const analyzeMutation = useAnalyzeImage();

  const handleImageSelected = (file: File) => {
    setSelectedFile(file);
    analyzeMutation.reset(); // Reset previous results if a new image is picked
  };

  const handleClear = () => {
    setSelectedFile(null);
    analyzeMutation.reset();
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      analyzeMutation.mutate(selectedFile);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white text-slate-900">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <ScanSearch className="w-5 h-5" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight text-slate-900">
            Image Context Extractor
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        
        {/* Intro text */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mb-4 text-slate-900">
            Understand any image instantly.
          </h2>
          <p className="text-slate-500 text-lg md:text-xl">
            Upload a photo and let advanced AI break down its subjects, mood, setting, and technical composition in seconds.
          </p>
        </div>

        <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
          
          {/* Uploader Section */}
          <motion.div 
            layout 
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <ImageUploader 
              selectedFile={selectedFile}
              onImageSelected={handleImageSelected}
              onClear={handleClear}
              isAnalyzing={analyzeMutation.isPending}
              onAnalyze={handleAnalyze}
            />
          </motion.div>

          {/* Error State */}
          <AnimatePresence>
            {analyzeMutation.isError && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900 shadow-sm">
                  <AlertCircle className="h-4 w-4" color="currentColor" />
                  <AlertTitle className="font-semibold">Analysis Failed</AlertTitle>
                  <AlertDescription className="text-red-700/80 mt-1">
                    {analyzeMutation.error.message}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <AnimatePresence mode="wait">
            {analyzeMutation.isSuccess && analyzeMutation.data && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <AnalysisResults data={analyzeMutation.data} />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </main>
    </div>
  );
}
