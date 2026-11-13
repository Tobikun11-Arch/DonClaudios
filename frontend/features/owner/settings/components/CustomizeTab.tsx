"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DashboardColorsCard } from "./DashboardColorsCard";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function CustomizeTab() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Color theme
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Light, dark, or follow your device. Showing:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {mounted ? resolvedTheme : "…"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = mounted && theme === opt.value;
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "gap-1.5",
                      active &&
                        "bg-[#2d4a35] hover:bg-[#3c5e45] dark:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <DashboardColorsCard />
    </div>
  );
}
