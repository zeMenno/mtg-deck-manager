import { Heart } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function WishlistPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase">Wishlist</h1>
      <EmptyState
        icon={Heart}
        title="Wishlist is empty"
        description="Saving cards for later arrives in Phase 12."
      />
    </div>
  );
}
