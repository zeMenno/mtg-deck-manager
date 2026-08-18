import { NextResponse } from "next/server";

import { buildSearchUpstream, proxyScryfallGet } from "@/lib/scryfall/proxy";
import type { SearchUniqueMode } from "@/lib/scryfall/endpoints";

export const dynamic = "force-dynamic";

/**
 * Optional Scryfall search proxy.
 * Enabled for clients when NEXT_PUBLIC_USE_SCRYFALL_PROXY=true.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json(
      {
        object: "error",
        code: "bad_request",
        status: 400,
        details: "Query parameter q must be at least 2 characters.",
      },
      { status: 400 },
    );
  }

  const pageRaw = searchParams.get("page");
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : undefined;
  const unique =
    (searchParams.get("unique") as SearchUniqueMode | null) ?? "cards";

  try {
    const upstream = buildSearchUpstream(q, {
      page: Number.isFinite(page) ? page : undefined,
      unique,
    });
    const response = await proxyScryfallGet(upstream);
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy failed";
    return NextResponse.json(
      {
        object: "error",
        code: "proxy_error",
        status: 502,
        details: message,
      },
      { status: 502 },
    );
  }
}
