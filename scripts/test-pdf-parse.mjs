/**
 * Quick test that pdf-parse can extract text from a PDF.
 * Run from mapleins:
 *   node scripts/test-pdf-parse.mjs              — runs with built-in minimal PDF
 *   node scripts/test-pdf-parse.mjs path/to.pdf   — runs with your PDF file
 */
import { readFileSync } from "fs";

const { PDFParse } = await import("pdf-parse");

// Minimal valid single-page PDF (no external refs) — just enough for pdfjs to parse
const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT\n/F1 12 Tf\n100 700 Td\n(Hello PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n297\n%%EOF",
  "utf8"
);

async function main() {
  let buffer;
  const arg = process.argv[2];
  if (arg) {
    console.log("Reading PDF file:", arg);
    buffer = readFileSync(arg);
  } else {
    console.log("Using built-in minimal PDF.");
    buffer = MINIMAL_PDF;
  }
  console.log("PDF size:", buffer.length, "bytes");
  if (buffer.length < 20 || buffer.slice(0, 5).toString() !== "%PDF-") {
    console.error("✗ Not a valid PDF (missing %PDF- header or too small).");
    process.exit(1);
  }

  console.log("Running pdf-parse (PDFParse class)...");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result?.text ?? "";
    console.log("Extracted text length:", text.length);
    console.log("First 400 chars:", text.slice(0, 400) || "(empty)");
    console.log("\n✓ pdf-parse works.");
  } finally {
    await parser.destroy();
  }
}

main().catch((err) => {
  console.error("✗ Error:", err.message || err);
  process.exit(1);
});
