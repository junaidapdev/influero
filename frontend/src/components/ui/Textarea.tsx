import { forwardRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
};

// Multi-line counterpart to Input — same border/focus tokens, taller minimum.
// forwardRef so react-hook-form's register() can attach its ref.
export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { hasError = false, className = "", ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`min-h-[88px] w-full rounded-md border bg-surface px-3.5 py-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        hasError ? "border-error" : "border-border"
      } ${className}`}
      {...rest}
    />
  );
});
