import type { ReactNode } from "react";

import { DeckLayoutClient } from "@/components/deck/deck-layout-client";

type LayoutProps = {
  children: ReactNode;
};

/** Shared deck sub-route shell with upgrade summary bar. */
export default function DeckLayout({ children }: LayoutProps) {
  return <DeckLayoutClient>{children}</DeckLayoutClient>;
}
