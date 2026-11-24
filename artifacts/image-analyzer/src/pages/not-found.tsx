import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-6.25rem)] w-full max-w-[1200px] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-mono text-[13px] text-ink-3">404</p>
      <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-ink">This page doesn’t exist</h1>
      <p className="mt-1.5 text-[14px] text-ink-2">The link may be old, or the project may have been deleted.</p>
      <Link href="/" className="mt-6 inline-flex h-9 items-center rounded-md bg-ink px-4 text-[14px] font-medium text-surface no-underline hover:opacity-85">
        Back to Analyze
      </Link>
    </main>
  );
}
