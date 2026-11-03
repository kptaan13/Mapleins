/**
 * PDF text extraction using unpdf (pure JS, works on Vercel serverless).
 * Falls back to pdftotext (poppler) when available in local/server environments.
 */
import { execFile } from "child_process";
import { writeFile, unlink, mkdtemp, rmdir } from "fs/promises";
import { promisify } from "util";
import { join } from "path";
import { tmpdir } from "os";
import { assertSafeRemoteUrl } from "@/lib/security/remote-url";
import { fetchWithTimeoutRetry } from "@/lib/net";

const execFileAsync = promisify(execFile);

async function parseWithUnpdf(buffer: Buffer): Promise<string> {
  // unpdf ships a serverless build of Mozilla's current pdf.js.
  // (pdf-parse v1 bundles pdf.js from 2018 and rejects many valid PDFs with "bad XRef entry".)
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}

/**
 * Extract plain text from a PDF buffer.
 * Tries pdftotext first (better quality), falls back to unpdf (pure JS).
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let tmpDir: string | null = null;
  let pdfPath: string | null = null;

  try {
    tmpDir = await mkdtemp(join(tmpdir(), "mapleins-"));
    pdfPath = join(tmpDir, "resume.pdf");
    await writeFile(pdfPath, buffer);

    const { stdout } = await execFileAsync("pdftotext", ["-raw", pdfPath, "-"], {
      timeout: 15000,
      maxBuffer: 5 * 1024 * 1024,
    });

    const text = stdout?.trim() ?? "";
    if (text.length > 50) return text;

    // Retry with layout mode if raw gave thin output
    const { stdout: stdout2 } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
      timeout: 15000,
      maxBuffer: 5 * 1024 * 1024,
    });
    const text2 = stdout2?.trim() ?? "";
    if (text2.length > 50) return text2;
  } catch {
    // pdftotext not available (e.g. Vercel) — fall through to unpdf
  } finally {
    if (pdfPath) { try { await unlink(pdfPath); } catch { /* ignore */ } }
    if (tmpDir) { try { await rmdir(tmpDir); } catch { /* ignore */ } }
  }

  // Pure-JS fallback — works on all serverless environments
  try {
    return await parseWithUnpdf(buffer);
  } catch (err) {
    console.error("[pdfExtract] unpdf failed:", (err as Error).message ?? err);
    return "";
  }
}

/**
 * Fetch a PDF from a URL and extract its text.
 */
export async function extractTextFromPDFUrl(url: string): Promise<string> {
  const safeUrl = await assertSafeRemoteUrl(url);
  const res = await fetchWithTimeoutRetry(
    safeUrl.toString(),
    undefined,
    { retries: 1, timeoutMs: Number(process.env.REMOTE_PDF_FETCH_TIMEOUT_MS) || 12000 }
  );
  if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return extractTextFromPDF(buffer);
}
