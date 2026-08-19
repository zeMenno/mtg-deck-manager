"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Layers, Search, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/cards", label: "Cards", icon: Search },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      data-testid="bottom-nav"
      className="pb-safe border-border bg-background fixed inset-x-0 bottom-0 z-50 border-t shadow-md md:hidden"
    >
      <ul className="mx-auto flex h-(--bottom-nav-height) max-w-3xl items-stretch">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={cn(
                  "border-border flex h-full min-h-11 w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-bold uppercase transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
