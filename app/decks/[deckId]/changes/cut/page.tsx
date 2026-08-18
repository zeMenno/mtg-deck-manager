import { ChangesCutPageClient } from "@/components/changes/changes-cut-page-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function ChangesCutPage({ params }: PageProps) {
  return <ChangesCutPageClient params={params} />;
}
