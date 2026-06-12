import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-dark",
  secondary:
    "bg-surface border border-border text-text-primary hover:bg-surface-secondary",
  ghost: "bg-transparent text-accent hover:bg-surface-secondary",
  destructive:
    "bg-surface border border-error-light text-error-foreground hover:bg-error-lightest",
};

export function Button({
  variant = "primary",
  isLoading = false,
  // Default to "button" so a Button placed inside a <form> never submits by
  // accident — submit buttons opt in explicitly with type="submit".
  type = "button",
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
