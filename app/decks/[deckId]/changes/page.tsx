import { ChangesPageClient } from "@/components/changes/changes-page-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function ChangesPage({ params }: PageProps) {
  return <ChangesPageClient params={params} />;
}
