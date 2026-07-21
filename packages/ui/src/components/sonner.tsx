"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          success:
            "group-[.toaster]:!border-success/30 group-[.toaster]:!bg-success/10 group-[.toaster]:!text-success",
          info: "group-[.toaster]:!border-info/30 group-[.toaster]:!bg-info/10 group-[.toaster]:!text-info",
          warning:
            "group-[.toaster]:!border-warning/35 group-[.toaster]:!bg-warning/15 group-[.toaster]:!text-warning",
          error:
            "group-[.toaster]:!border-destructive/30 group-[.toaster]:!bg-destructive/10 group-[.toaster]:!text-destructive",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
