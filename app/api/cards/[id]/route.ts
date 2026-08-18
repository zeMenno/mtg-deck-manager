import { NextResponse } from "next/server";

import { buildCardUpstream, proxyScryfallGet } from "@/lib/scryfall/proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Optional Scryfall single-card proxy.
 * Enabled for clients when NEXT_PUBLIC_USE_SCRYFALL_PROXY=true.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      {
        object: "error",
        code: "bad_request",
        status: 400,
        details: "Card id is required.",
      },
      { status: 400 },
    );
  }

  try {
    const upstream = buildCardUpstream(id);
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
