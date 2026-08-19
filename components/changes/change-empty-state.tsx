"use client";

type ChangeEmptyStateProps = {
  title: string;
  description?: string;
  testId?: string;
};

export function ChangeEmptyState({
  title,
  description,
  testId = "change-empty-state",
}: ChangeEmptyStateProps) {
  return (
    <div
      className="border-border flex flex-col gap-2 border border-dashed p-6 text-center"
      data-testid={testId}
    >
      <p className="font-bold">{title}</p>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
    </div>
  );
}
