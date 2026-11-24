import { Link, useLocation, useSearch } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import { useProjects } from "@/components/project-context";
import { LogoMark, ThemeToggle } from "@/components/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function Slash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 text-line-2">
      <path d="M16.88 3.55 7.12 20.45" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

/** A small deterministic swatch so each client is recognisable at a glance in the switcher. */
export function ProjectAvatar({ name, className }: { name: string; className?: string }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-5 w-5 shrink-0 rounded-full", className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 85% 62%), hsl(${(hue + 50) % 360} 85% 55%))` }}
    />
  );
}

export function AppHeader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { projects, selectedProject, selectProject, isLoading } = useProjects();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const userName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "Account";

  const tab = new URLSearchParams(search).get("tab") ?? "details";
  const onProjectPage = selectedProject && location === `/projects/${selectedProject.id}/settings`;
  const tabs: { href: string; label: string; active: boolean }[] = selectedProject
    ? [
        { href: "/", label: "Analyze", active: location === "/" },
        { href: `/projects/${selectedProject.id}/settings?tab=memory`, label: "Findings", active: Boolean(onProjectPage && tab === "memory") },
        { href: `/projects/${selectedProject.id}/settings?tab=knowledge`, label: "Knowledge", active: Boolean(onProjectPage && tab === "knowledge") },
        { href: `/projects/${selectedProject.id}/settings?tab=integrations`, label: "Connected systems", active: Boolean(onProjectPage && tab === "integrations") },
        { href: `/projects/${selectedProject.id}/settings?tab=details`, label: "Settings", active: Boolean(onProjectPage && tab === "details") },
      ]
    : [
        { href: "/", label: "Analyze", active: location === "/" },
        { href: "/projects", label: "Client projects", active: location.startsWith("/projects") },
      ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-1 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md text-ink no-underline" aria-label="Visual Context Extractor home">
          <LogoMark />
          <span className="hidden text-[14px] font-semibold tracking-[-0.01em] md:inline">Visual Context Extractor</span>
        </Link>

        {isSignedIn && (
          <>
            <Slash />
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={isLoading}
                className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[14px] font-medium text-ink outline-none transition-colors hover:bg-subtle data-[state=open]:bg-subtle disabled:opacity-60"
              >
                {selectedProject ? (
                  <>
                    <ProjectAvatar name={selectedProject.name} />
                    <span className="max-w-[12rem] truncate">{selectedProject.name}</span>
                  </>
                ) : (
                  <span className="text-ink-2">{isLoading ? "Loading projects…" : "No client project"}</span>
                )}
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                <span className="sr-only">Switch client project</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 rounded-xl border-line-2 bg-surface p-1.5 shadow-pop">
                <DropdownMenuLabel className="px-2 py-1.5 text-[12px] font-normal text-ink-2">Client projects</DropdownMenuLabel>
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onSelect={() => {
                      selectProject(project.id);
                      if (location !== "/") setLocation(`/projects/${project.id}/settings?tab=${onProjectPage ? tab : "memory"}`);
                    }}
                    className="gap-2.5 rounded-md px-2 py-2 text-[14px]"
                  >
                    <ProjectAvatar name={project.name} />
                    <span className="min-w-0 flex-1 truncate">{project.name}</span>
                    {selectedProject?.id === project.id && <Check className="h-4 w-4 text-ink" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onSelect={() => {
                    selectProject(null);
                    setLocation("/");
                  }}
                  className="gap-2.5 rounded-md px-2 py-2 text-[14px] text-ink-2"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-line-2" />
                  <span className="flex-1">Work without a project</span>
                  {!selectedProject && <Check className="h-4 w-4 text-ink" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-line" />
                <DropdownMenuItem onSelect={() => setLocation("/projects")} className="gap-2.5 rounded-md px-2 py-2 text-[14px]">
                  <LayoutGrid className="h-4 w-4 text-ink-2" /> All client projects
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLocation("/projects?new=1")} className="gap-2.5 rounded-md px-2 py-2 text-[14px]">
                  <Plus className="h-4 w-4 text-ink-2" /> New client project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          {!isLoaded ? (
            <span className="h-8 w-24 animate-pulse rounded-md bg-subtle" />
          ) : isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account"
                className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-ink text-[12px] font-medium text-surface outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-fact"
              >
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  initials(userName)
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl border-line-2 bg-surface p-1.5 shadow-pop">
                <div className="px-2 py-2">
                  <p className="truncate text-[14px] font-medium text-ink">{userName}</p>
                  {user?.primaryEmailAddress?.emailAddress && (
                    <p className="truncate text-[13px] text-ink-2">{user.primaryEmailAddress.emailAddress}</p>
                  )}
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 sm:hidden">
                  <span className="text-[14px] text-ink-2">Theme</span>
                  <ThemeToggle />
                </div>
                <DropdownMenuSeparator className="my-1.5 bg-line" />
                <DropdownMenuItem onSelect={() => setLocation("/projects")} className="rounded-md px-2 py-2 text-[14px]">
                  Client projects
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void signOut({ redirectUrl: "/" })}
                  className="rounded-md px-2 py-2 text-[14px]"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/sign-in" className="inline-flex h-8 items-center rounded-md border border-line-2 bg-surface px-3 text-[14px] font-medium text-ink no-underline transition-colors hover:bg-subtle">
                Sign in
              </Link>
              <Link href="/sign-up" className="inline-flex h-8 items-center rounded-md bg-ink px-3 text-[14px] font-medium text-surface no-underline transition-opacity hover:opacity-85">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Sections" className="-mb-px flex h-11 items-stretch gap-1 overflow-x-auto px-2 sm:px-4">
        {tabs.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "relative flex shrink-0 items-center rounded-md px-2.5 text-[14px] no-underline transition-colors",
              item.active ? "text-ink" : "text-ink-2 hover:text-ink",
              "after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-full",
              item.active && "after:bg-ink",
            )}
          >
            <span className="rounded-md px-1 py-1 hover:bg-subtle">{item.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
