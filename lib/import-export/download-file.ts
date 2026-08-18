/**
 * Download / share helpers for backup and deck export files.
 */

export type DownloadFileOptions = {
  filename: string;
  mimeType?: string;
  /** Prefer Web Share API with files when available (iOS). */
  preferShare?: boolean;
};

/**
 * Download a Blob via an anchor click. Returns when the click is dispatched.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after a tick so Safari can start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadText(
  contents: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8",
): void {
  downloadBlob(new Blob([contents], { type: mimeType }), filename);
}

export function downloadJson(
  data: unknown,
  filename: string,
  pretty = true,
): void {
  const text = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  downloadBlob(
    new Blob([text], { type: "application/json;charset=utf-8" }),
    filename,
  );
}

function canShareFiles(file: File): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function"
  ) {
    return false;
  }
  if (typeof navigator.canShare !== "function") {
    return true;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Share via Web Share API when supported; otherwise download.
 * Share cancellation resolves without throwing.
 */
export async function shareOrDownloadFile(
  contents: string | Blob,
  options: DownloadFileOptions,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const mimeType = options.mimeType ?? "application/json";
  const blob =
    typeof contents === "string"
      ? new Blob([contents], { type: mimeType })
      : contents;
  const file = new File([blob], options.filename, { type: mimeType });

  if (options.preferShare !== false && canShareFiles(file)) {
    try {
      await navigator.share({
        files: [file],
        title: options.filename,
      });
      return "shared";
    } catch (err) {
      // User cancelled share sheet — do not fall through to download.
      if (
        err instanceof DOMException &&
        (err.name === "AbortError" || err.name === "NotAllowedError")
      ) {
        return "cancelled";
      }
      // Fall through to download on other share failures.
    }
  }

  downloadBlob(blob, options.filename);
  return "downloaded";
}
