import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
};

// Styled NATIVE select — same border/focus/height tokens as Input. Native on
// purpose: RTL-correct and mobile-friendly for free (the OS picker); a custom
// dropdown is v2 polish. appearance-none hides the platform arrow so the
// trailing chevron can sit on the logical end and mirror with direction.
// forwardRef so react-hook-form's register() attaches its ref.
export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { hasError = false, className = "", children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`min-h-11 w-full appearance-none rounded-md border ${
          hasError ? "border-error" : "border-border"
        } bg-surface px-3.5 py-3 pe-10 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
    </div>
  );
});
