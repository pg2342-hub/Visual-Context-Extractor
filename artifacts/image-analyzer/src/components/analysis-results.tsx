import React from 'react';
import { motion } from 'framer-motion';
import type { AnalyzeImageResponse } from '../../../lib/api-client-react/src/generated/api.schemas';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlignLeft, 
  Sparkles, 
  MapPin, 
  Palette, 
  Smile, 
  Tags, 
  Camera, 
  Sun, 
  SlidersHorizontal 
} from 'lucide-react';

interface AnalysisResultsProps {
  data: AnalyzeImageResponse;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function AnalysisResults({ data }: AnalysisResultsProps) {
  
  // Helper to determine if a color string might be a valid CSS color
  const renderColorSwatch = (colorStr: string) => {
    // Basic heuristic: remove spaces, lowercase, try to apply
    const cleanColor = colorStr.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
        <div 
          className="w-4 h-4 rounded-full border border-black/10 shadow-inner"
          style={{ backgroundColor: colorStr }}
        />
        <span className="text-xs font-medium text-slate-700 capitalize">{colorStr}</span>
      </div>
    );
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full flex flex-col gap-6 pb-12"
    >
      {/* Summary Header */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6 md:p-8 bg-gradient-to-br from-white to-slate-50/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0 mt-1">
            <AlignLeft className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-900 mb-2">Executive Summary</h2>
            <p className="text-slate-600 leading-relaxed md:text-lg">
              {data.summary}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          
          {/* Subjects */}
          <motion.variants variants={itemVariants}>
            <Card className="border-slate-100 shadow-sm overflow-hidden group hover:border-primary/20 transition-colors">
              <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-indigo-500" />
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-800">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold font-display">Primary Subjects</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.subjects.length > 0 ? data.subjects.map((subject, idx) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                      {subject}
                    </Badge>
                  )) : <span className="text-sm text-slate-400">None detected</span>}
                </div>
              </CardContent>
            </Card>
          </motion.variants>

          {/* Setting & Mood */}
          <motion.variants variants={itemVariants}>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-slate-100 shadow-sm">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center gap-2 h-full">
                  <MapPin className="w-6 h-6 text-emerald-500 mb-1" />
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Setting</h3>
                  <p className="font-medium text-slate-800 capitalize">{data.setting || 'Unknown'}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-100 shadow-sm">
                <CardContent className="p-5 flex flex-col justify-center items-center text-center gap-2 h-full">
                  <Smile className="w-6 h-6 text-amber-500 mb-1" />
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mood</h3>
                  <p className="font-medium text-slate-800 capitalize">{data.mood || 'Neutral'}</p>
                </CardContent>
              </Card>
            </div>
          </motion.variants>

          {/* Colors */}
          <motion.variants variants={itemVariants}>
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-800">
                  <Palette className="w-5 h-5 text-rose-500" />
                  <h3 className="font-semibold font-display">Dominant Colors</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {data.colors.length > 0 ? data.colors.map((color, idx) => (
                    <React.Fragment key={idx}>
                      {renderColorSwatch(color)}
                    </React.Fragment>
                  )) : <span className="text-sm text-slate-400">None extracted</span>}
                </div>
              </CardContent>
            </Card>
          </motion.variants>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
          {/* Technical Details */}
          <motion.variants variants={itemVariants}>
            <Card className="border-slate-100 shadow-sm bg-slate-900 text-slate-100 overflow-hidden relative">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-bl-full blur-3xl opacity-50" />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-2 mb-6 text-white">
                  <Camera className="w-5 h-5 text-primary-foreground/70" />
                  <h3 className="font-semibold font-display text-lg">Technical Analysis</h3>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <SlidersHorizontal className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Composition</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200">{data.technical_details.composition}</p>
                  </div>
                  <div className="h-px w-full bg-slate-800" />
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Sun className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Lighting</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200">{data.technical_details.lighting}</p>
                  </div>
                  <div className="h-px w-full bg-slate-800" />
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">Quality & Texture</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200">{data.technical_details.quality}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.variants>

          {/* Tags */}
          <motion.variants variants={itemVariants}>
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-800">
                  <Tags className="w-5 h-5 text-teal-500" />
                  <h3 className="font-semibold font-display">Related Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.tags.length > 0 ? data.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      #{tag}
                    </span>
                  )) : <span className="text-sm text-slate-400">No tags generated</span>}
                </div>
              </CardContent>
            </Card>
          </motion.variants>

          {/* Text Content (if any) */}
          {data.text_content && data.text_content.trim() !== "" && (
            <motion.variants variants={itemVariants}>
              <Card className="border-amber-100 shadow-sm bg-amber-50/30">
                <CardContent className="p-5">
                  <h3 className="font-semibold font-display text-amber-900 mb-3 text-sm uppercase tracking-wider">Detected Text</h3>
                  <div className="p-4 bg-white/60 rounded-lg border border-amber-100 font-mono text-sm text-slate-700 whitespace-pre-wrap">
                    {data.text_content}
                  </div>
                </CardContent>
              </Card>
            </motion.variants>
          )}

        </div>
      </div>
    </motion.div>
  );
}
