/**
 * Example PDF extraction tool - returns raw text from an uploaded PDF.
 * POST multipart/form-data with field "file" (PDF).
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/route";
import { ApiError } from "@/lib/api/error";

const fileMetaSchema = z.object({
  name: z.string().min(1).max(256),
  type: z.string().max(128),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});

async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const fn = typeof pdfParse === "function" ? pdfParse : pdfParse.default ?? pdfParse.pdf;
  if (typeof fn !== "function") throw new Error("pdf-parse not available");
  const result = await fn(buffer);
  return result?.text?.trim() ?? "";
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new ApiError(400, "Send a PDF file as multipart/form-data with field 'file'.", {
        code: "INVALID_CONTENT_TYPE",
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      throw new ApiError(400, "No file or empty file.", { code: "MISSING_FILE" });
    }

    const meta = fileMetaSchema.safeParse({
      name: file.name || "upload.pdf",
      type: file.type || "",
      size: file.size,
    });
    if (!meta.success) {
      throw new ApiError(400, "Invalid file metadata.", {
        code: "INVALID_FILE_METADATA",
        details: meta.error.flatten(),
      });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      throw new ApiError(400, "File must be a PDF (application/pdf).", { code: "INVALID_FILE_TYPE" });
    }

    const text = await extractTextFromBuffer(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ text, fileName: file.name });
  },
  {
    routeKey: "api:tools-pdf-text",
    rateLimit: { limit: 15, windowMs: 60_000 },
  }
);

