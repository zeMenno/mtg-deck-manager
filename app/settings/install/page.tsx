import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Share, SquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Install on iPhone",
  description:
    "Add MTG Deck Builder to your iPhone Home Screen so it opens full screen and works offline.",
};

const steps = [
  {
    title: "Open this page in Safari",
    body: "Add to Home Screen only exists in Safari. Chrome, Firefox, and in-app browsers on iOS cannot install a web app.",
  },
  {
    title: "Tap the Share button",
    body: "It is the square with an arrow pointing up, in the bottom toolbar.",
    icon: Share,
  },
  {
    title: 'Choose "Add to Home Screen"',
    body: "Scroll down the share sheet. If you do not see it, tap Edit Actions and enable it.",
    icon: SquarePlus,
  },
  {
    title: 'Name it and tap "Add"',
    body: '"Deck Builder" is filled in for you. The icon then appears on your Home Screen.',
  },
  {
    title: "Launch from the Home Screen icon",
    body: "The app opens full screen with no Safari address bar. That is the mode to use from now on.",
  },
];

export default function InstallPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black uppercase">Install on iPhone</h1>
        <p className="text-muted-foreground text-sm">
          iOS has no install button a website can trigger, so the steps below
          are manual. It takes about fifteen seconds.
        </p>
      </div>

      <aside className="border-border bg-warning text-warning-foreground shadow-brutal flex items-start gap-3 border-4 p-4">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-black uppercase">Install first</h2>
          <p className="text-sm">
            Safari and the installed app keep <strong>separate storage</strong>.
            Decks you build in Safari will not be in the Home Screen app, and
            the only way to move them across is an export and re-import. Install
            before you build your first deck.
          </p>
        </div>
      </aside>

      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <li
              key={step.title}
              className="border-border bg-card shadow-brutal-sm flex gap-3 border-2 p-4"
            >
              <span
                aria-hidden="true"
                className="border-border bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center border-2 font-mono text-sm font-bold"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase">
                  {step.title}
                  {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
                </h2>
                <p className="text-muted-foreground text-sm">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="font-mono text-xs uppercase">After installing</h2>
          <ul className="text-muted-foreground flex list-disc flex-col gap-2 pl-5 text-sm">
            <li>
              The app shell keeps working without a connection. Card search
              needs the network and returns in a later phase.
            </li>
            <li>
              Deleting the Home Screen icon deletes the app&apos;s local data.
              Export a backup first.
            </li>
            <li>
              When a new version ships, the app offers a
              <strong> Reload </strong> prompt. Take it — it swaps in the new
              version without touching your data.
            </li>
          </ul>
          <Button asChild variant="outline" className="self-start">
            <Link href="/settings">Back to settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
