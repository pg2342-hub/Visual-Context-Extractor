import { cn } from "@/lib/utils";
import type { ProjectFindingType } from "@workspace/api-client-react";

/**
 * The finding mark: one shape per kind, so kind never depends on colour alone.
 * fact = circle (blue), conflict = diamond (red), open question = rounded square (amber).
 */
export function FindingMark({
  type,
  n,
  size = "md",
  muted = false,
  className,
}: {
  type: ProjectFindingType;
  n?: number | string;
  size?: "sm" | "md";
  muted?: boolean;
  className?: string;
}) {
  const dim = size === "sm" ? "h-[18px] w-[18px] text-[10px]" : "h-[22px] w-[22px] text-[11px]";
  const tone =
    type === "fact" ? "bg-fact" : type === "conflict" ? "bg-conflict" : "bg-question";
  const shape =
    type === "fact" ? "rounded-full" : type === "conflict" ? "rotate-45 rounded-[4px] scale-[.86]" : "rounded-[5px]";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid shrink-0 place-items-center font-mono font-medium leading-none text-white dark:text-black",
        dim,
        className,
      )}
    >
      <span className={cn("absolute inset-0", tone, shape, muted && "opacity-45")} />
      {n !== undefined && <span className="relative">{n}</span>}
    </span>
  );
}

export const KIND_LABEL: Record<ProjectFindingType, string> = {
  fact: "Fact",
  conflict: "Conflict",
  open_question: "Open question",
};

export function KindLabel({ type }: { type: ProjectFindingType }) {
  const tone = type === "fact" ? "text-fact" : type === "conflict" ? "text-conflict" : "text-question";
  return <span className={cn("text-[13px] font-medium", tone)}>{KIND_LABEL[type]}</span>;
}

/** A source citation chip: IMG-1, DOC-…, project notes. */
export function SourceChip({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full items-center truncate rounded-full border px-2 font-mono text-[11.5px] transition-colors",
        active ? "border-fact bg-fact-bg text-fact" : "border-line-2 text-ink",
      )}
    >
      {children}
    </span>
  );
}

export function sourceText(ref: string, label?: string) {
  if (ref === "PROJECT_KNOWLEDGE") return "Project notes";
  if (/^IMG-\d+$/.test(ref) || /^DOC-/.test(ref)) return ref;
  return label ?? ref;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}
