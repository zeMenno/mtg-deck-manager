import { DbTestClient } from "@/components/dev/db-test-client";

export const dynamic = "force-dynamic";

/**
 * Dev-only CRUD smoke harness. In production builds the page renders a
 * short unavailable message instead of calling `notFound()` (which breaks
 * Next's page data collection).
 */
export default function DevDbTestPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="border-border shadow-brutal mx-auto max-w-lg border-4 p-6">
        <h1 className="font-heading text-xl font-black uppercase">
          Not available
        </h1>
        <p className="mt-2 font-mono text-sm">
          The DB test harness is disabled in production.
        </p>
      </div>
    );
  }

  return <DbTestClient />;
}
