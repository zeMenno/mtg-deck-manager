import { ChangesProjectedPageClient } from "@/components/changes/changes-projected-page-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function ChangesProjectedPage({ params }: PageProps) {
  return <ChangesProjectedPageClient params={params} />;
}
