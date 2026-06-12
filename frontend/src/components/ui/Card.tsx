import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

// The default content surface: white card, hairline border, 16px padding.
// Color goes INSIDE cards (pills, stripes, text), never on the surface.
export function Card({ children, className = "", ...rest }: Props) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface p-4 shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
