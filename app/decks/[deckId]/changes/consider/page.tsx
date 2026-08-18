import { ChangesConsiderPageClient } from "@/components/changes/changes-consider-page-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function ChangesConsiderPage({ params }: PageProps) {
  return <ChangesConsiderPageClient params={params} />;
}
