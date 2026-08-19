/**
 * FileReader helpers with size guards for import flows.
 */

import { MAX_IMPORT_FILE_BYTES } from "@/lib/import-export/backup-version";

export class ImportFileTooLargeError extends Error {
  readonly maxBytes: number;
  readonly actualBytes: number;

  constructor(actualBytes: number, maxBytes = MAX_IMPORT_FILE_BYTES) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    super(
      `Import file is too large (${formatBytes(actualBytes)}). Maximum is ${maxMb} MB.`,
    );
    this.name = "ImportFileTooLargeError";
    this.actualBytes = actualBytes;
    this.maxBytes = maxBytes;
  }
}

export class ImportJsonParseError extends Error {
  constructor(cause?: unknown) {
    const detail =
      cause instanceof Error && cause.message ? ` (${cause.message})` : "";
    super(`Backup file is not valid JSON${detail}`);
    this.name = "ImportJsonParseError";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function assertFileSize(
  file: Pick<File, "size">,
  maxBytes = MAX_IMPORT_FILE_BYTES,
): void {
  if (file.size > maxBytes) {
    throw new ImportFileTooLargeError(file.size, maxBytes);
  }
}

/** Read a File as UTF-8 text with a max-size guard. */
export async function readFileAsText(
  file: File,
  maxBytes = MAX_IMPORT_FILE_BYTES,
): Promise<string> {
  assertFileSize(file, maxBytes);
  return file.text();
}

/** Parse a JSON file; throws ImportJsonParseError on syntax errors. */
export async function readJsonFile<T = unknown>(
  file: File,
  maxBytes = MAX_IMPORT_FILE_BYTES,
): Promise<T> {
  const text = await readFileAsText(file, maxBytes);
  return parseJsonText<T>(text);
}

/** Parse JSON text; throws ImportJsonParseError on syntax errors. */
export function parseJsonText<T = unknown>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new ImportJsonParseError(err);
  }
}
