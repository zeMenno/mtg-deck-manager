/**
 * Estimate local IndexedDB / origin storage usage for Settings → Data.
 */

export type StorageUsageEstimate = {
  usageBytes: number | null;
  quotaBytes: number | null;
  source: "navigator.storage" | "serialized" | "unavailable";
  label: string;
};

function formatMb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Prefer `navigator.storage.estimate()`; fall back to serialized JSON size.
 */
export async function estimateStorageUsage(
  serializeFallback?: () => Promise<string>,
): Promise<StorageUsageEstimate> {
  if (
    typeof navigator !== "undefined" &&
    navigator.storage &&
    typeof navigator.storage.estimate === "function"
  ) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ?? null;
      const quota = estimate.quota ?? null;
      if (usage !== null) {
        return {
          usageBytes: usage,
          quotaBytes: quota,
          source: "navigator.storage",
          label:
            quota !== null
              ? `Local storage: ~${formatMb(usage)} used of ~${formatMb(quota)}`
              : `Local storage: ~${formatMb(usage)} used`,
        };
      }
    } catch {
      // fall through
    }
  }

  if (serializeFallback) {
    try {
      const json = await serializeFallback();
      const bytes = new Blob([json]).size;
      return {
        usageBytes: bytes,
        quotaBytes: null,
        source: "serialized",
        label: `Local storage: ~${formatMb(bytes)} (approximate)`,
      };
    } catch {
      // fall through
    }
  }

  return {
    usageBytes: null,
    quotaBytes: null,
    source: "unavailable",
    label: "Local storage: size unavailable",
  };
}
