import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { useUser } from '@clerk/react';
import { AlertCircle } from 'lucide-react';
import { ImageUploader, LensPicker, MODES } from '@/components/image-uploader';
import { AnalysisResults } from '@/components/analysis-results';
import { ProjectCandidateReview } from '@/components/project-candidate-review';
import { useAnalyzeImage, type AnalysisMode } from '@/hooks/use-analyze';
import { isValidImageType } from '@/lib/utils';
import { useProjects } from '@/components/project-context';
import { FindingMark } from '@/components/marks';

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<AnalysisMode>('summarize');
  const [activeFinding, setActiveFinding] = useState<number | null>(null);
  const { selectedProject } = useProjects();
  const { isSignedIn } = useUser();

  const analyzeMutation = useAnalyzeImage();

  const handleImagesSelected = (files: File[]) => {
    setSelectedFiles(prev => {
      const all = [...prev, ...files.filter(isValidImageType)];
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
      analyzeMutation.mutate({ files: selectedFiles, mode, projectId: selectedProject?.id });
    }
  };

  const lens = MODES.find((m) => m.value === mode)!;
  const result = analyzeMutation.isSuccess ? analyzeMutation.data : undefined;
  const candidates = result?.candidate_findings ?? [];

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-ink">
            {selectedProject ? 'New analysis' : 'Analyze images'}
          </h1>
          <p className="mt-1 text-[14px] text-ink-2">{lens.description}</p>
        </div>
        <LensPicker mode={mode} onModeChange={handleModeChange} disabled={analyzeMutation.isPending} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <ImageUploader
            selectedFiles={selectedFiles}
            onImagesSelected={handleImagesSelected}
            onRemoveImage={handleRemoveImage}
            onClearAll={handleClearAll}
            isAnalyzing={analyzeMutation.isPending}
            onAnalyze={handleAnalyze}
            mode={mode}
            findings={candidates}
            activeFinding={activeFinding}
            onFocusFinding={setActiveFinding}
          />

          <AnimatePresence>
            {analyzeMutation.isError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-conflict/30 bg-conflict-bg px-4 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-conflict" />
                <div>
                  <p className="text-[14px] font-medium text-ink">The analysis didn’t finish</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">{analyzeMutation.error.message}. Try again, or remove any very large images first.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={`results-${mode}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <AnalysisResults data={result} mode={mode} projectId={selectedProject?.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[124px]">
          {result && selectedProject && candidates.length > 0 ? (
            <ProjectCandidateReview projectId={selectedProject.id} candidates={candidates} onHighlight={setActiveFinding} activeId={activeFinding} />
          ) : (
            <FindingsPlaceholder
              signedIn={Boolean(isSignedIn)}
              projectName={selectedProject?.name}
              state={analyzeMutation.isPending ? 'running' : result ? 'none' : 'idle'}
            />
          )}
        </aside>
      </div>
    </main>
  );
}

function FindingsPlaceholder({ signedIn, projectName, state }: { signedIn: boolean; projectName?: string; state: 'idle' | 'running' | 'none' }) {
  const title = !projectName
    ? 'Findings need a client project'
    : state === 'running'
      ? 'Reading your images…'
      : state === 'none'
        ? 'No findings proposed this time'
        : 'Findings will appear here';
  const body = !projectName
    ? signedIn
      ? 'You can analyze images without a project. To keep facts, conflicts and open questions for a client, choose a project from the switcher at the top.'
      : 'You can analyze images right away. Sign in to keep facts, conflicts and open questions for each client.'
    : state === 'none'
      ? 'Nothing in these images was solid enough to carry forward. The analysis on the left is still yours to use.'
      : `Each finding is numbered and cites the image or document it came from. You confirm or dismiss it before it joins ${projectName}'s memory.`;

  return (
    <section aria-labelledby="ph-h" className="rounded-xl border border-dashed border-line-2 px-5 py-6">
      <div className="mb-4 flex items-center gap-1.5" aria-hidden="true">
        <FindingMark type="fact" n={1} muted={state !== 'running'} />
        <FindingMark type="conflict" n={2} muted={state !== 'running'} />
        <FindingMark type="open_question" n={3} muted={state !== 'running'} />
      </div>
      <h2 id="ph-h" className="text-[15px] font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-[13px] leading-[1.55] text-ink-2">{body}</p>
      <dl className="mt-4 grid gap-2 text-[13px]">
        <div className="flex items-center gap-2"><FindingMark type="fact" size="sm" /><dt className="text-ink">Fact</dt><dd className="text-ink-2">visible and supported</dd></div>
        <div className="flex items-center gap-2"><FindingMark type="conflict" size="sm" /><dt className="text-ink">Conflict</dt><dd className="text-ink-2">sources disagree</dd></div>
        <div className="flex items-center gap-2"><FindingMark type="open_question" size="sm" /><dt className="text-ink">Open question</dt><dd className="text-ink-2">ask the client</dd></div>
      </dl>
      {!projectName && (
        <Link
          href={signedIn ? '/projects' : '/sign-in'}
          className="mt-5 inline-flex h-8 items-center rounded-md border border-line-2 bg-surface px-3 text-[13px] font-medium text-ink no-underline transition-colors hover:bg-subtle"
        >
          {signedIn ? 'Choose a client project' : 'Sign in'}
        </Link>
      )}
    </section>
  );
}
