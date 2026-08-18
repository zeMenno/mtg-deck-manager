import { DeckDashboardSkeleton } from "@/components/shared/skeletons";

export default function DeckChangesLoading() {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="deck-changes-route-loading"
    >
      <DeckDashboardSkeleton />
    </div>
  );
}
