import { NextResponse } from "next/server";

import {
  buildSetCollectorUpstream,
  proxyScryfallGet,
} from "@/lib/scryfall/proxy";

export const dynamic = "force-dynamic";

/**
 * Optional Scryfall set + collector-number proxy (`/cards/{set}/{number}`).
 * Enabled for clients when NEXT_PUBLIC_USE_SCRYFALL_PROXY=true.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const set = searchParams.get("set")?.trim();
  const number = searchParams.get("number")?.trim();
  if (!set || !number) {
    return NextResponse.json(
      {
        object: "error",
        code: "bad_request",
        status: 400,
        details: "Provide set and number query parameters.",
      },
      { status: 400 },
    );
  }

  try {
    const upstream = buildSetCollectorUpstream(set, number);
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
