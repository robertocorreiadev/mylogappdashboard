"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import type { Theme } from "@/lib/theme"

// Toasts com as cores do tema (tokens de globals.css). O tema vem do layout
// raiz (cookie), não de next-themes.
function Toaster({ theme, ...props }: Omit<ToasterProps, "theme"> & { theme: Theme }) {
  return (
    <Sonner
      theme={theme}
      position="top-center"
      closeButton
      richColors
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
