import { useEffect, useRef, useState } from 'react';
import type { ProjectFinding } from '@workspace/api-client-react';
import { FindingMark, KIND_LABEL } from '@/components/marks';
import { cn } from '@/lib/utils';

type Rect = { left: number; top: number; width: number; height: number };

/** The rectangle an object-fit: contain image actually paints inside its element box. */
function paintedRect(img: HTMLImageElement): Rect | null {
  const { naturalWidth: nw, naturalHeight: nh, clientWidth: cw, clientHeight: ch, offsetLeft, offsetTop } = img;
  if (!nw || !nh || !cw || !ch) return null;
  const scale = Math.min(cw / nw, ch / nh);
  const width = nw * scale;
  const height = nh * scale;
  return { left: offsetLeft + (cw - width) / 2, top: offsetTop + (ch - height) / 2, width, height };
}

const tone = {
  fact: 'border-fact bg-fact/10',
  conflict: 'border-conflict bg-conflict/10',
  open_question: 'border-question bg-question/10',
} as const;

export function MarkedImage({
  src,
  alt,
  imageRef,
  findings,
  active,
  dimmed,
  className,
  imgClassName,
  onFocusFinding,
  onOpen,
  large = false,
}: {
  src: string;
  alt: string;
  imageRef: string;
  findings: { finding: ProjectFinding; n: number }[];
  active: number[];
  dimmed?: boolean;
  className?: string;
  imgClassName?: string;
  onFocusFinding?: (id: number | null) => void;
  /** Called when the image itself (not a mark) is clicked, to open the expanded view. */
  onOpen?: () => void;
  /** Bigger marks and thicker outlines for the expanded view. */
  large?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const update = () => setRect(paintedRect(img));
    update();
    img.addEventListener('load', update);
    const observer = new ResizeObserver(update);
    observer.observe(img);
    return () => {
      img.removeEventListener('load', update);
      observer.disconnect();
    };
  }, [src]);

  const placed = findings.flatMap(({ finding, n }) =>
    (finding.regions ?? []).filter((r) => r.imageRef === imageRef).map((region, i) => ({ finding, n, region, key: `${finding.id}-${i}` })),
  );
  const placedIds = new Set(placed.map((p) => p.finding.id));
  const unplaced = findings.filter(({ finding }) => !placedIds.has(finding.id));
  const anyActive = active.length > 0;

  return (
    <div className={cn('relative', onOpen && 'cursor-zoom-in', className)} onClick={onOpen}>
      <img ref={imgRef} src={src} alt={alt} className={cn('transition-opacity', dimmed && 'opacity-60', imgClassName)} />

      {rect && placed.length > 0 && (
        <div className="pointer-events-none absolute" style={rect}>
          {placed.map(({ finding, n, region, key }) => {
            const on = active.includes(finding.id);
            const done = finding.status !== 'pending';
            return (
              <div
                key={key}
                className={cn(
                  'absolute rounded-[4px] transition-[opacity,box-shadow] duration-200',
                  large ? 'border-2' : 'border-[1.5px]',
                  tone[finding.type],
                  finding.type === 'conflict' && 'border-dashed',
                  finding.type === 'open_question' && 'border-dotted',
                  anyActive && !on && 'opacity-25',
                  !anyActive && done && 'opacity-50',
                  on && 'shadow-[0_0_0_3px_var(--ds-surface)]',
                )}
                style={{
                  left: `${region.x * 100}%`,
                  top: `${region.y * 100}%`,
                  width: `${region.width * 100}%`,
                  height: `${region.height * 100}%`,
                }}
              >
                <button
                  type="button"
                  className={cn(
                    'pointer-events-auto absolute rounded-full outline-none focus-visible:ring-2 focus-visible:ring-fact',
                    region.x + region.width > 0.95 ? 'right-[3px]' : '-right-[11px]',
                    region.y < 0.05 ? 'top-[3px]' : '-top-[11px]',
                  )}
                  aria-label={`Finding ${n}, ${KIND_LABEL[finding.type]}: ${finding.statement}`}
                  title={finding.statement}
                  onMouseEnter={() => onFocusFinding?.(finding.id)}
                  onMouseLeave={() => onFocusFinding?.(null)}
                  onFocus={() => onFocusFinding?.(finding.id)}
                  onBlur={() => onFocusFinding?.(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    const target = document.getElementById(`viewer-finding-${finding.id}`) ?? document.getElementById(`finding-${finding.id}`);
                    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                >
                  <FindingMark type={finding.type} n={n} muted={done && !on} className={cn('drop-shadow-sm', large && 'scale-[1.2]')} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {unplaced.length > 0 && (
        <div
          className="absolute flex flex-wrap justify-end gap-1"
          style={rect ? { left: rect.left, top: rect.top + 8, width: rect.width - 8 } : { right: 10, top: 10 }}
          title="These findings cite the whole image"
        >
          {unplaced.map(({ finding, n }) => (
            <span
              key={finding.id}
              onMouseEnter={() => onFocusFinding?.(finding.id)}
              onMouseLeave={() => onFocusFinding?.(null)}
              className={cn('transition-opacity', anyActive && !active.includes(finding.id) && 'opacity-30')}
            >
              <FindingMark type={finding.type} n={n} muted={finding.status !== 'pending'} className="drop-shadow-sm" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
