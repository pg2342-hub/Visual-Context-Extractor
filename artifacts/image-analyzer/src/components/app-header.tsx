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
    <header className="sticky top-0 z-50 w-full border-b border-[#dce8ec]/80 bg-[#fbfdfe]/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[70px] max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3 text-slate-900 no-underline">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#d7e8ed] bg-[#eaf6f9] text-[#347f9d]">
            <ScanSearch className="h-[17px] w-[17px]" />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-[-0.035em] text-[#243d4b]">
            Image Context Extractor
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[#62747e] no-underline transition hover:bg-[#edf5f7] hover:text-[#24485a]"
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
                  className="h-10 min-w-44 appearance-none rounded-lg border border-[#dce8ec] bg-white/80 py-2 pl-3 pr-9 text-[13px] font-medium text-[#405762] outline-none transition hover:border-[#aacbd5] focus:border-[#6ba6ba] focus:ring-2 focus:ring-[#d8edf2] disabled:opacity-60"
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#dce8ec] text-[#607781] no-underline transition hover:bg-[#f1f8fa]"
                >
                  <Settings2 className="h-4 w-4" />
                </Link>
              )}
            </>
          )}

          <span className="mx-1 hidden h-7 border-l border-slate-200 sm:block" />
          {!isLoaded ? (
                <span className="h-9 w-20 animate-pulse rounded-lg bg-[#edf4f6]" />
          ) : isSignedIn ? (
            <div className="flex items-center gap-2">
                <span className="hidden max-w-36 truncate text-[13px] text-[#74858d] md:block">
                {user?.firstName || user?.primaryEmailAddress?.emailAddress}
              </span>
              <button
                type="button"
                onClick={() => void signOut({ redirectUrl: "/" })}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#62747e] transition hover:bg-[#edf5f7] hover:text-[#24485a]"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#62747e] no-underline transition hover:bg-[#edf5f7] hover:text-[#24485a]"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-[#347f9d] px-3.5 py-2 text-[13px] font-semibold text-white no-underline transition hover:bg-[#286d88]"
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
