"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

type WishlistEmptyStateProps = {
  filtered?: boolean;
};

export function WishlistEmptyState({
  filtered = false,
}: WishlistEmptyStateProps) {
  if (filtered) {
    return (
      <EmptyState
        icon={Heart}
        title="No matching cards"
        description="Try a different priority, deck filter, or search."
      />
    );
  }

  return (
    <EmptyState
      icon={Heart}
      title="Your wishlist is empty"
      description="Save cards from search or card detail, then promote them into a deck as CONSIDER or ADD."
      action={
        <Button asChild data-testid="wishlist-browse-cards-btn">
          <Link href="/cards">Browse cards</Link>
        </Button>
      }
    />
  );
}
