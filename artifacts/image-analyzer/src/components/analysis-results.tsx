import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlignLeft,
  Tags,
  Camera,
  Sun,
  SlidersHorizontal,
  Sparkles,
  FileText,
  BarChart2,
  Code2,
  Layers,
  Copy,
  Check,
  Table2,
  Lightbulb,
  Bug,
  Wrench,
} from 'lucide-react';
import type { AnalysisResponse, AnalysisMode } from '@/hooks/use-analyze';

interface AnalysisResultsProps {
  data: AnalysisResponse;
  mode: AnalysisMode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`border-slate-100 shadow-sm ${className ?? ''}`}>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function SectionHeader({ icon, title, color = 'text-slate-500' }: { icon: React.ReactNode; title: string; color?: string }) {
  return (
    <div className={`flex items-center gap-2 mb-3 ${color} text-slate-800`}>
      <span className={color}>{icon}</span>
      <h3 className="font-semibold">{title}</h3>
    </div>
  );
}

// ---- Mode-specific result renderers ----

function SummarizeResult({ result }: { result: Record<string, unknown> }) {
  const observations = (result.key_observations as string[]) ?? [];
  const context = (result.context as string) ?? '';
  return (
    <div className="flex flex-col gap-4">
      {observations.length > 0 && (
        <Section>
          <SectionCard>
            <SectionHeader icon={<Sparkles className="w-4 h-4" />} title="Key Observations" color="text-indigo-500" />
            <ul className="space-y-2">
              {observations.map((obs, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  {obs}
                </li>
              ))}
            </ul>
          </SectionCard>
        </Section>
      )}
      {context && (
        <Section>
          <SectionCard>
            <SectionHeader icon={<Lightbulb className="w-4 h-4" />} title="Context" color="text-amber-500" />
            <p className="text-sm text-slate-700 leading-relaxed">{context}</p>
          </SectionCard>
        </Section>
      )}
    </div>
  );
}

function DataPointsResult({ result }: { result: Record<string, unknown> }) {
  const chartType = (result.chart_type as string) ?? '';
  const dataPoints = (result.data_points as Array<{ label: string; value: string; unit?: string; category?: string }>) ?? [];
  const axes = result.axes as { x?: string; y?: string } | undefined;
  const insights = (result.insights as string[]) ?? [];
  const dataTitle = (result.data_title as string) ?? '';
  const [copied, setCopied] = useState(false);

  const copyAsCSV = () => {
    const header = 'Label,Value,Unit,Category';
    const rows = dataPoints.map(dp =>
      `"${dp.label}","${dp.value}","${dp.unit ?? ''}","${dp.category ?? ''}"`
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Chart info */}
      {(chartType || dataTitle) && (
        <Section>
          <div className="flex items-center gap-3 flex-wrap">
            {chartType && chartType !== 'none' && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                <BarChart2 className="w-3 h-3" /> {chartType}
              </Badge>
            )}
            {dataTitle && <span className="text-sm font-semibold text-slate-700">{dataTitle}</span>}
            {axes && (
              <span className="text-xs text-slate-400">
                {axes.x && `X: ${axes.x}`}{axes.x && axes.y && ' · '}{axes.y && `Y: ${axes.y}`}
              </span>
            )}
          </div>
        </Section>
      )}

      {/* Data table */}
      {dataPoints.length > 0 && (
        <Section>
          <SectionCard>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={<Table2 className="w-4 h-4" />} title="Extracted Data Points" color="text-blue-500" />
              <Button size="sm" variant="outline" onClick={copyAsCSV} className="gap-1.5 text-xs h-7">
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy CSV'}
              </Button>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Label</th>
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Value</th>
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                    <th className="text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {dataPoints.map((dp, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-2 py-2 font-medium text-slate-800">{dp.label}</td>
                      <td className="px-2 py-2 text-slate-700">{dp.value}</td>
                      <td className="px-2 py-2 text-slate-500">{dp.unit ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-500">{dp.category ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </Section>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Section>
          <SectionCard>
            <SectionHeader icon={<Lightbulb className="w-4 h-4" />} title="Insights" color="text-amber-500" />
            <ul className="space-y-2">
              {insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {ins}
                </li>
              ))}
            </ul>
          </SectionCard>
        </Section>
      )}
    </div>
  );
}

function UIElementsResult({ result }: { result: Record<string, unknown> }) {
  const layout = (result.layout_description as string) ?? '';
  const elements = (result.ui_elements as Array<{
    type: string; label: string; location: string; purpose: string; state?: string;
  }>) ?? [];
  const colorScheme = (result.color_scheme as string) ?? '';
  const a11y = (result.accessibility_notes as string) ?? '';

  return (
    <div className="flex flex-col gap-4">
      {layout && (
        <Section>
          <SectionCard>
            <SectionHeader icon={<Layers className="w-4 h-4" />} title="Layout" color="text-violet-500" />
            <p className="text-sm text-slate-700 leading-relaxed">{layout}</p>
          </SectionCard>
        </Section>
      )}

      {elements.length > 0 && (
        <Section>
          <SectionCard>
            <SectionHeader icon={<Table2 className="w-4 h-4" />} title={`UI Elements (${elements.length})`} color="text-violet-500" />
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {elements.map((el, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <Badge variant="outline" className="shrink-0 text-xs mt-0.5">{el.type}</Badge>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 truncate">{el.label || '(unlabeled)'}</span>
                      {el.state && <span className="text-xs text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{el.state}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{el.location} · {el.purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </Section>
      )}

      {(colorScheme || a11y) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {colorScheme && (
            <Section>
              <SectionCard>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Color Scheme</h4>
                <p className="text-sm text-slate-700">{colorScheme}</p>
              </SectionCard>
            </Section>
          )}
          {a11y && (
            <Section>
              <SectionCard>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Accessibility</h4>
                <p className="text-sm text-slate-700">{a11y}</p>
              </SectionCard>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function CodeResult({ result }: { result: Record<string, unknown> }) {
  const language = (result.language as string) ?? '';
  const description = (result.code_description as string) ?? '';
  const blocks = (result.code_blocks as Array<{ language: string; code: string; explanation: string }>) ?? [];
  const issues = (result.issues as string[]) ?? [];
  const solution = (result.solution as string) ?? '';
  const steps = (result.solution_steps as string[]) ?? [];
  const [copiedSolution, setCopiedSolution] = useState(false);

  const copySolution = () => {
    navigator.clipboard.writeText(solution);
    setCopiedSolution(true);
    setTimeout(() => setCopiedSolution(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Language + Description */}
      {(language || description) && (
        <Section>
          <SectionCard>
            <div className="flex items-center gap-2 mb-3">
              <Code2 className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-slate-800">Code Description</h3>
              {language && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">{language}</Badge>}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{description}</p>
          </SectionCard>
        </Section>
      )}

      {/* Extracted code blocks */}
      {blocks.map((block, i) => (
        <Section key={i}>
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900">
              <span className="text-xs font-mono text-slate-400">{block.language || 'code'}</span>
            </div>
            <pre className="bg-slate-950 text-slate-100 text-xs font-mono p-4 overflow-x-auto max-h-64 leading-relaxed">
              <code>{block.code}</code>
            </pre>
            {block.explanation && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                {block.explanation}
              </div>
            )}
          </div>
        </Section>
      ))}

      {/* Issues */}
      {issues.length > 0 && (
        <Section>
          <SectionCard className="border-red-100">
            <SectionHeader icon={<Bug className="w-4 h-4" />} title="Issues Found" color="text-red-500" />
            <ul className="space-y-2">
              {issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </SectionCard>
        </Section>
      )}

      {/* Solution */}
      {solution && (
        <Section>
          <div className="rounded-xl overflow-hidden border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-900">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-100">Solution</span>
              </div>
              <Button size="sm" variant="ghost" onClick={copySolution} className="gap-1.5 text-xs h-7 text-emerald-300 hover:text-emerald-100 hover:bg-emerald-800">
                {copiedSolution ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedSolution ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="bg-emerald-950 text-emerald-100 text-xs font-mono p-4 overflow-x-auto max-h-80 leading-relaxed">
              <code>{solution}</code>
            </pre>
          </div>
        </Section>
      )}

      {/* Solution steps */}
      {steps.length > 0 && (
        <Section>
          <SectionCard>
            <SectionHeader icon={<Lightbulb className="w-4 h-4" />} title="Solution Steps" color="text-amber-500" />
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </SectionCard>
        </Section>
      )}
    </div>
  );
}

// ---- Main component ----

export function AnalysisResults({ data, mode }: AnalysisResultsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full flex flex-col gap-5 pb-12"
    >
      {/* Summary */}
      <Section>
        <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-white to-slate-50/60">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                <AlignLeft className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1.5">Summary</h2>
                <p className="text-slate-600 leading-relaxed">{data.summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Mode-specific content */}
      {mode === 'summarize' && <SummarizeResult result={data.mode_result} />}
      {mode === 'extract_data_points' && <DataPointsResult result={data.mode_result} />}
      {mode === 'identify_ui_elements' && <UIElementsResult result={data.mode_result} />}
      {mode === 'describe_code' && <CodeResult result={data.mode_result} />}

      {/* Shared: Text content */}
      {data.text_content && data.text_content.trim() !== '' && (
        <Section>
          <SectionCard className="border-amber-100 bg-amber-50/30">
            <SectionHeader icon={<FileText className="w-4 h-4" />} title="Detected Text" color="text-amber-600" />
            <div className="p-3 bg-white/60 rounded-lg border border-amber-100 font-mono text-sm text-slate-700 whitespace-pre-wrap">
              {data.text_content}
            </div>
          </SectionCard>
        </Section>
      )}

      {/* Technical details */}
      <Section>
        <Card className="border-slate-100 shadow-sm bg-slate-900 text-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-28 h-28 bg-primary/20 rounded-bl-full blur-3xl opacity-40" />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold">Technical Details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wider">Composition</span>
                </div>
                <p className="text-sm text-slate-300">{data.technical_details.composition}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Sun className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wider">Lighting</span>
                </div>
                <p className="text-sm text-slate-300">{data.technical_details.lighting}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wider">Quality</span>
                </div>
                <p className="text-sm text-slate-300">{data.technical_details.quality}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Tags */}
      {data.tags.length > 0 && (
        <Section>
          <SectionCard>
            <SectionHeader icon={<Tags className="w-4 h-4" />} title="Tags" color="text-teal-500" />
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag, i) => (
                <span key={i} className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  #{tag}
                </span>
              ))}
            </div>
          </SectionCard>
        </Section>
      )}
    </motion.div>
  );
}
