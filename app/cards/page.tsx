import { Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function CardsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase">Cards</h1>
      <EmptyState
        icon={Search}
        title="Search coming soon"
        description="Scryfall card search is added in Phase 4."
      />
    </div>
  );
}
