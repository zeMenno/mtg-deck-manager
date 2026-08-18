import { NextResponse } from "next/server";

import { buildNamedUpstream, proxyScryfallGet } from "@/lib/scryfall/proxy";

export const dynamic = "force-dynamic";

/**
 * Optional Scryfall named-card proxy (`/cards/named`).
 * Enabled for clients when NEXT_PUBLIC_USE_SCRYFALL_PROXY=true.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fuzzy = searchParams.get("fuzzy")?.trim();
  const exact = searchParams.get("exact")?.trim();
  const name = fuzzy || exact;
  if (!name) {
    return NextResponse.json(
      {
        object: "error",
        code: "bad_request",
        status: 400,
        details: "Provide fuzzy or exact query parameter.",
      },
      { status: 400 },
    );
  }

  const set = searchParams.get("set")?.trim() || undefined;

  try {
    const upstream = buildNamedUpstream(name, {
      fuzzy: Boolean(fuzzy) || !exact,
      set,
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
