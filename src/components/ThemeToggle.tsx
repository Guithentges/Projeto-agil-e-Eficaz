import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={showLabel ? "sm" : "icon"}
        className={cn("shrink-0", showLabel ? "gap-2" : "h-9 w-9", className)}
        aria-label="Alternar tema"
        disabled
      >
        <Sun className="h-[18px] w-[18px] opacity-50" />
        {showLabel && <span className="text-sm">Tema</span>}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={showLabel ? "sm" : "icon"}
          className={cn(
            "shrink-0 relative overflow-hidden",
            showLabel ? "gap-2 px-3" : "h-9 w-9",
            "hover:bg-muted",
            className,
          )}
          onClick={toggle}
          aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          <Sun
            className={cn(
              "h-[18px] w-[18px] transition-all duration-300",
              isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
            )}
          />
          <Moon
            className={cn(
              "absolute h-[18px] w-[18px] transition-all duration-300",
              isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
            )}
          />
          {showLabel && (
            <span className="text-sm font-medium">{isDark ? "Tema claro" : "Tema escuro"}</span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isDark ? "Tema claro" : "Tema escuro"}
      </TooltipContent>
    </Tooltip>
  );
}
