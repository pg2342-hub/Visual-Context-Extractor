import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { AppHeader } from "@/components/app-header";
import { ProjectProvider } from "@/components/project-context";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import ProjectSettingsPage from "@/pages/project-settings";
import ProjectsPage from "@/pages/projects";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY.");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "var(--ds-ink)",
    colorPrimaryForeground: "var(--ds-surface)",
    colorForeground: "var(--ds-ink)",
    colorMutedForeground: "var(--ds-ink-2)",
    colorDanger: "var(--ds-conflict)",
    colorBackground: "var(--ds-surface)",
    colorInput: "var(--ds-surface)",
    colorInputForeground: "var(--ds-ink)",
    colorNeutral: "var(--ds-ink)",
    colorRing: "var(--ds-ring)",
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-surface rounded-xl w-[420px] max-w-full overflow-hidden border border-line shadow-pop",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-canvas !rounded-none",
    headerTitle: "text-ink font-semibold tracking-[-0.02em]",
    headerSubtitle: "text-ink-2",
    socialButtonsBlockButton: "border-line-2 bg-surface hover:bg-subtle",
    socialButtonsBlockButtonText: "text-ink font-medium",
    formFieldLabel: "text-ink-2 font-medium",
    formFieldInput: "border-line-2 bg-surface text-ink focus:border-ink-3",
    formButtonPrimary: "bg-ink text-surface hover:opacity-85 font-medium shadow-none",
    footerActionLink: "text-ink font-medium underline underline-offset-4",
    footerActionText: "text-ink-2",
    dividerText: "text-ink-3",
    dividerLine: "bg-line",
    identityPreviewEditButton: "text-ink",
    formFieldSuccessText: "text-ok",
    alertText: "text-conflict",
    alert: "border-conflict/30 bg-conflict-bg",
    otpCodeFieldInput: "border-line-2 text-ink",
    logoBox: "rounded-lg",
    logoImage: "rounded-lg",
  },
};

function SignInPage() {
  return (
    <div className="dot-grid flex min-h-[calc(100dvh-6.25rem)] items-center justify-center px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="dot-grid flex min-h-[calc(100dvh-6.25rem)] items-center justify-center px-4 py-10">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        queryClient.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function AppRoutes() {
  return (
    <ProjectProvider>
      <AppHeader />
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/projects/:id/settings" component={ProjectSettingsPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </ProjectProvider>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to open your client projects",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Keep each client’s findings in its own project",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider delayDuration={150}>
          <AppRoutes />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
