import { type ReactNode } from "react";
import { DataLabel } from "./primitives";

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div>
        <DataLabel>// {eyebrow}</DataLabel>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-nara-muted">{description}</p>
        )}
      </div>
      {right}
    </div>
  );
}