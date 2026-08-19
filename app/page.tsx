import Link from "next/link";

import { InstallBanner } from "@/components/pwa/install-banner";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <InstallBanner />

      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-black uppercase">MTG Deck Builder</h1>
        <p className="text-muted-foreground text-sm">
          Track what&apos;s in your deck, what&apos;s going in, and what it
          costs. Local-first — install to your Home Screen before building decks
          so your data stays with the app.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/decks">Go to decks</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/install">Install app</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/data">Backup &amp; restore</Link>
          </Button>
        </div>
      </section>

      <section className="border-border flex flex-col gap-2 rounded-md border p-4 shadow-sm">
        <h2 className="font-mono text-xs uppercase">Before you start</h2>
        <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
          <li>Add the app to your Home Screen (Safari → Share).</li>
          <li>Open it from the icon — not a Safari tab.</li>
          <li>Export backups from Settings → Data regularly.</li>
        </ol>
      </section>
    </div>
  );
}
