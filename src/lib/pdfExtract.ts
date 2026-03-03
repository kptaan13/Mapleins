/**
 * PDF text extraction using system pdftotext (poppler-utils).
 * Reliable in all Node.js environments — no DOM dependencies.
 */
import { execFile } from "child_process";
import { writeFile, unlink, mkdtemp, rmdir } from "fs/promises";
import { promisify } from "util";
import { join } from "path";
import { tmpdir } from "os";
import pdf from "pdf-parse";

const execFileAsync = promisify(execFile);

/**
 * Extract plain text from a PDF buffer using pdftotext.
 * Returns empty string on failure (never throws).
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let tmpDir: string | null = null;
  let pdfPath: string | null = null;

  try {
    tmpDir = await mkdtemp(join(tmpdir(), "mapleins-"));
    pdfPath = join(tmpDir, "resume.pdf");

    // Write buffer to temp file
    await writeFile(pdfPath, buffer);

    // Run pdftotext: -raw preserves line order, - at end = output to stdout
    const { stdout } = await execFileAsync("pdftotext", ["-raw", pdfPath, "-"], {
      timeout: 15000,
      maxBuffer: 5 * 1024 * 1024, // 5MB
    });

    const text = stdout?.trim() ?? "";
    if (text.length > 50) return text;

    // If -raw gives thin output, retry with -layout mode
    const { stdout: stdout2 } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
      timeout: 15000,
      maxBuffer: 5 * 1024 * 1024,
    });
    return stdout2?.trim() ?? "";
  } catch (err) {
    console.warn("[pdfExtract] pdftotext failed, trying pdf-parse fallback:", (err as Error).message ?? err);
    try {
      const result = await pdf(buffer);
      return result?.text?.trim() ?? "";
    } catch (fallbackErr) {
      console.error("[pdfExtract] pdf-parse fallback failed:", (fallbackErr as Error).message ?? fallbackErr);
      return "";
    }
  } finally {
    // Clean up temp file
    if (pdfPath) {
      try { await unlink(pdfPath); } catch { /* ignore */ }
    }
    if (tmpDir) {
      try { await rmdir(tmpDir); } catch { /* ignore */ }
    }
  }
}

/**
 * Fetch a PDF from a URL and extract its text.
 */
export async function extractTextFromPDFUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return extractTextFromPDF(buffer);
}
