import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

// A titled settings group inside a card: section heading + optional helper line
// + the controls.
export function SettingsSection({ title, description, children }: Props) {
  return (
    <Card>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {description ? (
          <p className="mt-1 text-body text-text-secondary">{description}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}
