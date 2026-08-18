"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { VersionDetailView } from "@/components/deck/version-detail-view";
import { Button } from "@/components/ui/button";

type VersionDetailPageClientProps = {
  params: Promise<{ deckId: string; versionId: string }>;
};

export function VersionDetailPageClient({
  params,
}: VersionDetailPageClientProps) {
  const { deckId, versionId } = use(params);

  return (
    <div className="flex flex-col gap-4">
      <Button
        asChild
        variant="ghost"
        size="icon"
        aria-label="Back to versions"
        className="self-start"
      >
        <Link href={`/decks/${deckId}/versions`}>
          <ArrowLeft className="size-5" />
        </Link>
      </Button>
      <VersionDetailView deckId={deckId} versionId={versionId} />
    </div>
  );
}
