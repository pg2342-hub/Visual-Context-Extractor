import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ProjectFinding } from '@workspace/api-client-react';
import { MarkedImage } from '@/components/marked-image';
import { FindingMark, KIND_LABEL, SourceChip, sourceText } from '@/components/marks';
import { cn } from '@/lib/utils';

export interface ViewerImage {
  src: string;
  name: string;
  imageRef: string;
}

/**
 * Full-window view of one image with its finding marks at a readable size, and the findings
 * that cite it alongside. Hovering either side lights up the other; arrows move between images.
 */
export function ImageViewer({
  images,
  findings,
  index,
  onIndexChange,
  onClose,
}: {
  images: ViewerImage[];
  findings: ProjectFinding[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const open = index !== null && images[index] !== undefined;
  const image = open ? images[index] : null;
  const numbered = findings.map((finding, i) => ({ finding, n: i + 1 }));
  const cited = image ? numbered.filter(({ finding }) => finding.sourceRefs.includes(image.imageRef)) : [];
  const many = images.length > 1;

  useEffect(() => setActive(null), [index]);

  const step = (delta: number) => {
    if (index === null || !many) return;
    onIndexChange((index + delta + images.length) % images.length);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') step(1);
            if (event.key === 'ArrowLeft') step(-1);
          }}
          className="fixed inset-2 z-[60] flex flex-col overflow-hidden rounded-xl border border-line-2 bg-surface shadow-pop outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[.98] sm:inset-6"
        >
          {image && (
            <>
              <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4">
                <span className="rounded-full border border-line-2 px-2 font-mono text-[11.5px] leading-5 text-ink">{image.imageRef}</span>
                <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{image.name}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  The image at full size with its {cited.length} finding marks, and the list of those findings.
                </DialogPrimitive.Description>
                {many && (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => step(-1)} aria-label="Previous image" className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-subtle hover:text-ink">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-mono text-[12px] text-ink-2 tabular">{(index ?? 0) + 1} / {images.length}</span>
                    <button type="button" onClick={() => step(1)} aria-label="Next image" className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-subtle hover:text-ink">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </span>
                )}
                <DialogPrimitive.Close aria-label="Close" className="ml-1 grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-subtle hover:text-ink">
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </header>

              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1">
                <div className="dot-grid flex min-h-0 items-center justify-center p-4 sm:p-8">
                  <MarkedImage
                    src={image.src}
                    alt={image.name}
                    imageRef={image.imageRef}
                    findings={cited}
                    active={active !== null ? [active] : []}
                    onFocusFinding={setActive}
                    className="h-full w-full"
                    imgClassName="block h-full w-full object-contain"
                    large
                  />
                </div>

                <aside className="max-h-[38vh] overflow-y-auto border-t border-line lg:max-h-none lg:border-l lg:border-t-0">
                  <h3 className="sticky top-0 border-b border-line bg-surface px-4 py-3 text-[13px] font-medium text-ink-2">
                    {cited.length ? `${cited.length} finding${cited.length > 1 ? 's' : ''} in this image` : 'No findings cite this image'}
                  </h3>
                  <ol>
                    {cited.map(({ finding, n }) => (
                      <li
                        key={finding.id}
                        id={`viewer-finding-${finding.id}`}
                        onMouseEnter={() => setActive(finding.id)}
                        onMouseLeave={() => setActive(null)}
                        className={cn(
                          'grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 transition-colors',
                          active === finding.id && 'bg-subtle',
                        )}
                      >
                        <FindingMark type={finding.type} n={n} muted={finding.status !== 'pending'} />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium text-ink-2">
                            {KIND_LABEL[finding.type]}
                            {!(finding.regions ?? []).some((r) => r.imageRef === image.imageRef) && <span className="font-normal text-ink-3"> · whole image</span>}
                          </p>
                          <p className="mt-0.5 text-[14px] leading-6 text-ink">{finding.statement}</p>
                          {finding.sourceRefs.length > 1 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {finding.sourceRefs.map((ref, i) => <SourceChip key={ref} active={ref === image.imageRef}>{sourceText(ref, finding.sourceLabels[i])}</SourceChip>)}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {cited.length > 0 && <p className="px-4 py-3 text-[12.5px] text-ink-3">Confirm or dismiss findings in the panel beside the images.</p>}
                </aside>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
