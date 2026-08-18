import { DeckCreateForm } from "@/components/deck/deck-create-form";
import { TextDecklistImport } from "@/components/deck/text-decklist-import";

export default function NewDeckPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase">New Deck</h1>
      <DeckCreateForm />
      <TextDecklistImport />
    </div>
  );
}
