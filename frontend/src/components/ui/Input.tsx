import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

// forwardRef so react-hook-form's register() can attach its ref.
export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { hasError = false, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`min-h-11 w-full rounded-md border bg-surface px-3.5 py-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        hasError ? "border-error" : "border-border"
      } ${className}`}
      {...rest}
    />
  );
});
