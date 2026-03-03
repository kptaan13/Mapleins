/**
 * Example PDF extraction tool — returns raw text from an uploaded PDF.
 * POST multipart/form-data with field "file" (PDF).
 * Response: { text: string } or { error: string }
 */
import { NextRequest } from "next/server";

// pdf-parse uses Node/PDF.js; must run in Node runtime
export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse");

async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result?.text ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`PDF parse failed: ${msg}`);
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return Response.json(
        { error: "Send a PDF file as multipart/form-data with field 'file'." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return Response.json({ error: "No file or empty file." }, { status: 400 });
    }
    const isPdf =
      file.type === "application/pdf" ||
      (file.name && file.name.toLowerCase().endsWith(".pdf"));
    if (!isPdf) {
      return Response.json({ error: "File must be a PDF (application/pdf)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer);

    return Response.json({ text, fileName: file.name });
  } catch (err) {
    console.error("PDF extract error:", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
