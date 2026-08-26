import type { ReactNode } from "react";

interface ComponentShowcaseProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ComponentShowcase({
  title,
  description,
  children,
}: ComponentShowcaseProps) {
  return (
    <div className="mb-12">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="rounded-lg p-6 bg-white shadow-card">{children}</div>
    </div>
  );
}
