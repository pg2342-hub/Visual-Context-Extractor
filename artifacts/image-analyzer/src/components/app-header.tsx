import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { ChevronDown, FolderKanban, ScanSearch, Settings2 } from "lucide-react";
import { useProjects } from "@/components/project-context";

export function AppHeader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { projects, selectedProject, selectProject, isLoading } = useProjects();
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3 text-slate-900 no-underline">
          <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
            <ScanSearch className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold tracking-tight">
            Image Context Extractor
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <FolderKanban className="h-4 w-4" />
            <span>Client projects</span>
          </Link>

          {isSignedIn && (
            <>
              <label className="relative flex items-center">
                <span className="sr-only">Choose the client project to work in</span>
                <select
                  value={selectedProject?.id ?? ""}
                  disabled={isLoading}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "__manage__") {
                      setLocation("/projects");
                      return;
                    }
                    selectProject(value ? Number(value) : null);
                    setLocation("/");
                  }}
                  className="h-10 min-w-44 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                >
                  <option value="">
                    {isLoading ? "Loading projects…" : "No project selected"}
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                  <option value="__manage__">Manage projects…</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
              </label>

              {selectedProject && (
                <Link
                  href={`/projects/${selectedProject.id}/settings`}
                  aria-label={`${selectedProject.name} settings`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                >
                  <Settings2 className="h-4 w-4" />
                </Link>
              )}
            </>
          )}

          <span className="mx-1 hidden h-7 border-l border-slate-200 sm:block" />
          {!isLoaded ? (
            <span className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
          ) : isSignedIn ? (
            <div className="flex items-center gap-2">
              <span className="hidden max-w-36 truncate text-sm text-slate-500 md:block">
                {user?.firstName || user?.primaryEmailAddress?.emailAddress}
              </span>
              <button
                type="button"
                onClick={() => void signOut({ redirectUrl: "/" })}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
