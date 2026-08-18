import { Layers } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function DecksPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase">Decks</h1>
      <EmptyState
        icon={Layers}
        title="No decks yet"
        description="Deck creation arrives in Phase 5, once local storage is in place."
      />
    </div>
  );
}
