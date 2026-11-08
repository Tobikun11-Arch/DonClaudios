"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

/*
 * App-wide toast design (one look for public pages and every dashboard):
 * a white card with a soft shadow and a coloured icon in a tinted circle,
 * instead of Sonner's flat full-colour "richColors" boxes.
 */

const iconWrap = "grid size-8 shrink-0 place-items-center rounded-full"

const ICONS: ToasterProps["icons"] = {
  success: (
    <span className={`${iconWrap} bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400`}>
      <CircleCheckIcon className="size-4" />
    </span>
  ),
  info: (
    <span className={`${iconWrap} bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400`}>
      <InfoIcon className="size-4" />
    </span>
  ),
  warning: (
    <span className={`${iconWrap} bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400`}>
      <TriangleAlertIcon className="size-4" />
    </span>
  ),
  error: (
    <span className={`${iconWrap} bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400`}>
      <OctagonXIcon className="size-4" />
    </span>
  ),
  loading: (
    <span className={`${iconWrap} bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300`}>
      <Loader2Icon className="size-4 animate-spin" />
    </span>
  ),
}

const CLASS_NAMES = {
  toast:
    "group pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-gray-200/80 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-gray-900",
  icon: "m-0 flex size-8 shrink-0 items-center justify-center",
  content: "flex min-w-0 flex-1 flex-col gap-0.5",
  title: "text-sm font-semibold leading-snug text-gray-900 dark:text-gray-50",
  description: "text-xs leading-snug text-gray-500 dark:text-gray-400",
  actionButton:
    "shrink-0 rounded-lg bg-[#2d4a35] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3c5e45]",
  cancelButton:
    "shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200",
  closeButton:
    "border border-gray-200 bg-white text-gray-500 hover:text-gray-900 dark:border-white/10 dark:bg-gray-900",
}

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      duration={3000}
      visibleToasts={4}
      gap={10}
      icons={ICONS}
      {...props}
      toastOptions={{
        ...toastOptions,
        // Fully custom look: Sonner's default and richColors styles are off.
        unstyled: true,
        classNames: { ...CLASS_NAMES, ...toastOptions?.classNames },
      }}
    />
  )
}

export { Toaster }
