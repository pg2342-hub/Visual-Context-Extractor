import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "system" | "light" | "dark";
const KEY = "vce-theme";

function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    apply(theme);
    try {
      if (theme === "system") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, theme);
    } catch {
      /* storage blocked: theme still applies for this visit */
    }
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "system", label: "Match system", Icon: Monitor },
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
  ];

  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-full border border-line-2 p-[2px]", className)}>
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full text-ink-2 transition-colors hover:text-ink",
            theme === value && "bg-subtle text-ink",
          )}
        >
          <Icon className="h-[14px] w-[14px]" />
        </button>
      ))}
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("h-6 w-6", className)}>
      <rect x="2.75" y="5.75" width="15.5" height="13.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18.25" cy="5.75" r="3.4" className="fill-fact" stroke="var(--ds-canvas)" strokeWidth="1.6" />
    </svg>
  );
}
