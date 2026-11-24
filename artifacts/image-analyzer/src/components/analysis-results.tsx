import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import type { AnalysisResponse, AnalysisMode } from '@/hooks/use-analyze';
import { FindingMark, KIND_LABEL, SourceChip, sourceText } from '@/components/marks';
import { cn } from '@/lib/utils';

interface AnalysisResultsProps {
  data: AnalysisResponse;
  mode: AnalysisMode;
  readOnly?: boolean;
  projectId?: number;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

function Block({
  title,
  count,
  action,
  children,
  flush = false,
  className,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <motion.section variants={item} className={cn('overflow-hidden rounded-xl border border-line bg-surface shadow-card', className)}>
      <header className="flex min-h-11 items-center gap-2 border-b border-line px-4 py-2">
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        {count !== undefined && <span className="font-mono text-[12px] text-ink-3">{count}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className={flush ? '' : 'px-4 py-4'}>{children}</div>
    </motion.section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((text, i) => (
        <li key={i} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2 text-[14px] leading-6 text-ink">
          <span aria-hidden="true" className="mt-[11px] h-[3px] w-[3px] rounded-full bg-ink-3" />
          {text}
        </li>
      ))}
    </ul>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((text, i) => (
        <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 text-[14px] leading-6 text-ink">
          <span className="mt-[2px] grid h-5 w-5 place-items-center rounded-full border border-line-2 font-mono text-[11px] text-ink-2">{i + 1}</span>
          {text}
        </li>
      ))}
    </ol>
  );
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'red' | 'amber' | 'blue' | 'green' }) {
  const tones = {
    neutral: 'border-line-2 text-ink-2',
    red: 'border-transparent bg-conflict-bg text-conflict',
    amber: 'border-transparent bg-question-bg text-question',
    blue: 'border-transparent bg-fact-bg text-fact',
    green: 'border-transparent bg-ok-bg text-ok',
  } as const;
  return <span className={cn('inline-flex h-[22px] shrink-0 items-center rounded-full border px-2 text-[12px] font-medium', tones[tone])}>{children}</span>;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 px-2.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-subtle"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-line bg-canvas">
            {head.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-4 py-2 text-[12.5px] font-medium text-ink-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-line last:border-0 transition-colors hover:bg-canvas">
              {cells.map((cell, j) => (
                <td key={j} className={cn('px-4 py-2.5 align-top', j === 0 ? 'font-medium text-ink' : 'text-ink-2')}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ code, language, caption }: { code: string; language?: string; caption?: string }) {
  return (
    <motion.figure variants={item} className="m-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex h-11 items-center justify-between border-b border-line px-4">
        <span className="font-mono text-[12.5px] text-ink-2">{language || 'code'}</span>
        <CopyButton text={code} />
      </div>
      <pre className="max-h-96 overflow-auto bg-canvas px-4 py-3.5 font-mono text-[13px] leading-[1.65] text-ink"><code>{code}</code></pre>
      {caption && <figcaption className="border-t border-line px-4 py-2.5 text-[13px] text-ink-2">{caption}</figcaption>}
    </motion.figure>
  );
}

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const severityTone = (s?: string) => {
  const v = s?.toLowerCase();
  return v === 'high' || v === 'critical' ? 'red' : v === 'medium' ? 'amber' : 'neutral';
};

// ---- Lens renderers ----

function SummarizeResult({ result }: { result: Record<string, unknown> }) {
  const observations = (result.key_observations as string[]) ?? [];
  const context = (result.context as string) ?? '';
  return (
    <>
      {observations.length > 0 && <Block title="Key observations" count={observations.length}><Bullets items={observations} /></Block>}
      {context && <Block title="Context"><p className="max-w-[72ch] text-[14px] leading-6 text-ink">{context}</p></Block>}
    </>
  );
}

function DataPointsResult({ result }: { result: Record<string, unknown> }) {
  const chartType = (result.chart_type as string) ?? '';
  const dataPoints = (result.data_points as Array<{ label: string; value: string; unit?: string; category?: string }>) ?? [];
  const axes = result.axes as { x?: string; y?: string } | undefined;
  const insights = (result.insights as string[]) ?? [];
  const dataTitle = (result.data_title as string) ?? '';
  const csv = [
    'Label,Value,Unit,Category',
    ...dataPoints.map((dp) => [dp.label, dp.value, dp.unit ?? '', dp.category ?? ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return (
    <>
      {dataPoints.length > 0 && (
        <Block
          title={dataTitle || 'Data points'}
          count={dataPoints.length}
          action={<CopyButton text={csv} label="Copy as CSV" />}
          flush
        >
          {(chartType && chartType !== 'none') || axes?.x || axes?.y ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 text-[13px] text-ink-2">
              {chartType && chartType !== 'none' && <Pill>{chartType}</Pill>}
              {axes?.x && <span>X: <span className="text-ink">{axes.x}</span></span>}
              {axes?.y && <span>Y: <span className="text-ink">{axes.y}</span></span>}
            </div>
          ) : null}
          <Table
            head={['Label', 'Value', 'Unit', 'Category']}
            rows={dataPoints.map((dp) => [dp.label, <span className="font-mono text-[13px] text-ink">{dp.value}</span>, dp.unit || '–', dp.category || '–'])}
          />
        </Block>
      )}
      {insights.length > 0 && <Block title="Insights" count={insights.length}><Bullets items={insights} /></Block>}
    </>
  );
}

function UIElementsResult({ result }: { result: Record<string, unknown> }) {
  const layout = (result.layout_description as string) ?? '';
  const elements = (result.ui_elements as Array<{ type: string; label: string; location: string; purpose: string; state?: string }>) ?? [];
  const colorScheme = (result.color_scheme as string) ?? '';
  const a11y = (result.accessibility_notes as string) ?? '';

  return (
    <>
      {layout && <Block title="Layout"><p className="max-w-[72ch] text-[14px] leading-6 text-ink">{layout}</p></Block>}
      {elements.length > 0 && (
        <Block title="Elements" count={elements.length} flush>
          <Table
            head={['Element', 'Type', 'Location', 'Purpose', 'State']}
            rows={elements.map((el) => [el.label || 'Unlabeled', <Pill>{el.type}</Pill>, el.location, el.purpose, el.state || '–'])}
          />
        </Block>
      )}
      {(colorScheme || a11y) && (
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2">
          {colorScheme && (
            <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card">
              <h3 className="text-[13px] font-medium text-ink-2">Color scheme</h3>
              <p className="mt-1 text-[14px] leading-6 text-ink">{colorScheme}</p>
            </div>
          )}
          {a11y && (
            <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card">
              <h3 className="text-[13px] font-medium text-ink-2">Accessibility</h3>
              <p className="mt-1 text-[14px] leading-6 text-ink">{a11y}</p>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}

function CodeResult({ result }: { result: Record<string, unknown> }) {
  const language = (result.language as string) ?? '';
  const description = (result.code_description as string) ?? '';
  const blocks = (result.code_blocks as Array<{ language: string; code: string; explanation: string }>) ?? [];
  const issues = (result.issues as string[]) ?? [];
  const solution = (result.solution as string) ?? '';
  const steps = (result.solution_steps as string[]) ?? [];

  return (
    <>
      {(language || description) && (
        <Block title="What the code does" action={language ? <Pill>{language}</Pill> : undefined}>
          <p className="max-w-[72ch] text-[14px] leading-6 text-ink">{description}</p>
        </Block>
      )}
      {blocks.map((block, i) => <CodeBlock key={i} code={block.code} language={block.language || language} caption={block.explanation} />)}
      {issues.length > 0 && (
        <Block title="Issues" count={issues.length}>
          <ul className="space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 text-[14px] leading-6 text-ink">
                <span aria-hidden="true" className="mt-[7px] h-2 w-2 rotate-45 rounded-[2px] bg-conflict" />
                {issue}
              </li>
            ))}
          </ul>
        </Block>
      )}
      {solution && <CodeBlock code={solution} language={`Corrected ${language || 'code'}`} />}
      {steps.length > 0 && <Block title="How to apply the fix" count={steps.length}><Steps items={steps} /></Block>}
    </>
  );
}

function SystemDesignResult({ result }: { result: Record<string, unknown> }) {
  const overview = (result.architecture_overview as string) ?? '';
  const systems = (result.systems as Array<{ name: string; type: string; responsibility: string; technology?: string }>) ?? [];
  const integrations = (result.integrations as Array<{ source: string; target: string; protocol: string; data_exchanged: string }>) ?? [];
  const flows = (result.data_flows as string[]) ?? [];
  const risks = (result.risks as Array<{ area: string; description: string; severity: string }>) ?? [];
  const recommendations = (result.recommendations as Array<{ priority: string; recommendation: string; rationale: string }>) ?? [];
  const questions = (result.assumptions_and_questions as string[]) ?? [];

  return (
    <>
      {overview && <Block title="Architecture overview"><p className="max-w-[72ch] text-[14px] leading-6 text-ink">{overview}</p></Block>}
      {systems.length > 0 && (
        <Block title="Systems" count={systems.length} flush>
          <Table
            head={['System', 'Role', 'Responsibility', 'Technology']}
            rows={systems.map((s) => [s.name, s.type ? <Pill>{s.type}</Pill> : '–', s.responsibility || '–', s.technology || 'Unclear'])}
          />
        </Block>
      )}
      {integrations.length > 0 && (
        <Block title="Integrations" count={integrations.length} flush>
          <Table
            head={['From', 'To', 'How', 'What moves']}
            rows={integrations.map((it) => [it.source, <span className="font-medium text-ink">{it.target}</span>, it.protocol ? <span className="font-mono text-[12.5px]">{it.protocol}</span> : 'Unclear', it.data_exchanged || '–'])}
          />
        </Block>
      )}
      {flows.length > 0 && <Block title="Data flows" count={flows.length}><Steps items={flows} /></Block>}
      {risks.length > 0 && (
        <Block title="Risks and gaps" count={risks.length} flush>
          <ul>
            {risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0">
                <Pill tone={severityTone(risk.severity)}>{cap(risk.severity) || 'Unrated'}</Pill>
                <div className="min-w-0">
                  {risk.area && <p className="text-[13px] font-medium text-ink-2">{risk.area}</p>}
                  <p className="text-[14px] leading-6 text-ink">{risk.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {recommendations.length > 0 && (
        <Block title="Recommendations" count={recommendations.length} flush>
          <ul>
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0">
                <Pill tone={severityTone(rec.priority) === 'red' ? 'red' : severityTone(rec.priority) === 'amber' ? 'amber' : 'neutral'}>{cap(rec.priority) || 'Unrated'}</Pill>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium leading-6 text-ink">{rec.recommendation}</p>
                  {rec.rationale && <p className="text-[13px] leading-[1.55] text-ink-2">{rec.rationale}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {questions.length > 0 && (
        <Block title="Questions for the client" count={questions.length}>
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 text-[14px] leading-6 text-ink">
                <FindingMark type="open_question" size="sm" className="mt-[3px] scale-[.8]" />
                {q}
              </li>
            ))}
          </ul>
        </Block>
      )}
    </>
  );
}

// ---- Main ----

export function AnalysisResults({ data, mode, readOnly = false }: AnalysisResultsProps) {
  const memory = data.memory_used;
  const memoryGroups = memory
    ? ([
        ['Confirmed facts', memory.confirmedFacts],
        ['Open conflicts', memory.openConflicts],
        ['Open questions', memory.openQuestions ?? []],
      ] as const).filter(([, list]) => list.length > 0)
    : [];
  const tech = data.technical_details;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex w-full flex-col gap-4">
      <motion.section variants={item} className="rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
        <h2 className="text-[13px] font-medium text-ink-2">Summary</h2>
        <p className="mt-1.5 max-w-[75ch] text-[15px] leading-[1.65] text-ink">{data.summary}</p>
        {data.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {data.tags.map((tag, i) => <Pill key={i}>{tag}</Pill>)}
          </div>
        )}
      </motion.section>

      {mode === 'summarize' && <SummarizeResult result={data.mode_result} />}
      {mode === 'extract_data_points' && <DataPointsResult result={data.mode_result} />}
      {mode === 'identify_ui_elements' && <UIElementsResult result={data.mode_result} />}
      {mode === 'describe_code' && <CodeResult result={data.mode_result} />}
      {mode === 'system_design' && <SystemDesignResult result={data.mode_result} />}

      {data.text_content && data.text_content.trim() !== '' && (
        <Block title="Text found in the images" action={<CopyButton text={data.text_content} />} flush>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-canvas px-4 py-3.5 font-mono text-[13px] leading-[1.65] text-ink">{data.text_content}</pre>
        </Block>
      )}

      {memoryGroups.length > 0 && (
        <Block title="Project memory used for this run">
          <p className="mb-3 text-[13px] text-ink-2">Reviewed findings given to the model as background, not as claims about what the images show.</p>
          <div className="space-y-3">
            {memoryGroups.map(([label, list]) => (
              <div key={label}>
                <h4 className="mb-1 text-[13px] font-medium text-ink-2">{label}</h4>
                <ul className="space-y-1">
                  {list.map((m) => (
                    <li key={m.id} className="text-[14px] leading-6 text-ink">
                      {m.statement}
                      {m.sourceLabels.length > 0 && <span className="ml-1.5 font-mono text-[12px] text-ink-3">{m.sourceLabels.join(', ')}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Block>
      )}

      {tech && (tech.composition || tech.lighting || tech.quality) && (
        <motion.details variants={item} className="group rounded-xl border border-line bg-surface shadow-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[14px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Image characteristics
            <span className="ml-auto text-[13px] font-normal text-ink-2 group-open:hidden">Show</span>
            <span className="ml-auto hidden text-[13px] font-normal text-ink-2 group-open:inline">Hide</span>
          </summary>
          <dl className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-3">
            {([['Composition', tech.composition], ['Lighting', tech.lighting], ['Quality', tech.quality]] as const).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px] font-medium text-ink-2">{k}</dt>
                <dd className="mt-0.5 text-[14px] leading-6 text-ink">{v || '–'}</dd>
              </div>
            ))}
          </dl>
        </motion.details>
      )}

      {readOnly && data.candidate_findings && data.candidate_findings.length > 0 && (
        <Block title="Findings from this run" count={data.candidate_findings.length} flush>
          <ol>
            {data.candidate_findings.map((finding, i) => (
              <li key={finding.id} data-testid={`historical-candidate-${finding.id}`} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3.5 last:border-0">
                <FindingMark type={finding.type} n={i + 1} muted={finding.status !== 'pending'} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-medium text-ink-2">{KIND_LABEL[finding.type]}</span>
                    <span className="text-ink-3">·</span>
                    <span className="text-ink-2">{finding.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="mt-0.5 text-[14px] leading-6 text-ink">{finding.statement}</p>
                  {finding.sourceRefs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {finding.sourceRefs.map((ref, j) => <SourceChip key={ref}>{sourceText(ref, finding.sourceLabels[j])}</SourceChip>)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Block>
      )}
    </motion.div>
  );
}
