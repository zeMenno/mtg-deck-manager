import type { MetadataRoute } from "next";

/**
 * Personal-use PWA — discourage indexing of deck/manager routes.
 * Allow the root so the install URL remains discoverable if shared.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dev/", "/decks/", "/wishlist/", "/settings/data"],
    },
  };
}
