import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  // Optional muted icon above the copy.
  icon?: LucideIcon;
  message: string;
  // The single next-action CTA (e.g. an "Add your first brand" button).
  action?: ReactNode;
};

// Reusable empty state per ui-rules: a small muted icon, one line of copy, and
// one CTA. Every list that can be empty renders this instead of a blank panel.
export function EmptyState({ icon: Icon, message, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      {Icon ? <Icon className="size-8 text-text-muted" aria-hidden="true" /> : null}
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
