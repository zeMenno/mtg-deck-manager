import { ChangesAddPageClient } from "@/components/changes/changes-add-page-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function ChangesAddPage({ params }: PageProps) {
  return <ChangesAddPageClient params={params} />;
}
