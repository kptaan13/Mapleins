/**
 * PDF text extraction using pdf-parse (pure JS, works on Vercel serverless).
 * Falls back to pdftotext (poppler) when available in local/server environments.
 */
import { execFile } from "child_process";
import { writeFile, unlink, mkdtemp, rmdir } from "fs/promises";
import { promisify } from "util";
import { join } from "path";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

async function parseWithPdfParse(buffer: Buffer): Promise<string> {
  // pdf-parse v1 exports a single default function
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const fn = typeof pdfParse === "function" ? pdfParse : pdfParse.default ?? pdfParse.pdf;
  if (typeof fn !== "function") throw new Error("pdf-parse not available");
  const result = await fn(buffer);
  return result?.text?.trim() ?? "";
}

/**
 * Extract plain text from a PDF buffer.
 * Tries pdftotext first (better quality), falls back to pdf-parse (pure JS).
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
    // pdftotext not available (e.g. Vercel) — fall through to pdf-parse
  } finally {
    if (pdfPath) { try { await unlink(pdfPath); } catch { /* ignore */ } }
    if (tmpDir) { try { await rmdir(tmpDir); } catch { /* ignore */ } }
  }

  // Pure-JS fallback — works on all serverless environments
  try {
    return await parseWithPdfParse(buffer);
  } catch (err) {
    console.error("[pdfExtract] pdf-parse failed:", (err as Error).message ?? err);
    return "";
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
