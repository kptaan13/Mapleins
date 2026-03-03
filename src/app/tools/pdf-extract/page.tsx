"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function PdfExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (chosen) {
      if (chosen.type !== "application/pdf") {
        setError("Please select a PDF file.");
        setFile(null);
        setText(null);
        return;
      }
      setFile(chosen);
      setError(null);
      setText(null);
    }
  };

  const submitFile = async (pdfFile: File) => {
    setLoading(true);
    setError(null);
    setText(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch("/api/tools/pdf-text", {
        method: "POST",
        body: formData,
      });

      let data: { text?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        setError("Server returned invalid response. Check the API.");
        return;
      }

      if (!res.ok) {
        setError(data?.error ?? `Request failed (${res.status})`);
        return;
      }

      setText(typeof data.text === "string" ? data.text : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a PDF file first.");
      return;
    }
    await submitFile(file);
  };

  const handleSamplePdf = async () => {
    setError(null);
    setText(null);
    setLoading(true);
    try {
      const res = await fetch("/sample.pdf");
      if (!res.ok) throw new Error(`Sample PDF not found (${res.status}). Check that public/sample.pdf exists.`);
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample.pdf", { type: "application/pdf" });
      await submitFile(sampleFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sample PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold">PDF text extraction</h1>
        </div>

        <p className="mb-6 text-muted-foreground">
          Upload a PDF to test extraction. This uses the same logic as the resume analyzer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pdf-file">PDF file</Label>
            <input
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
            />
            {file && (
              <p className="mt-2 text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!file || loading}>
              {loading ? "Extracting…" : "Extract text"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleSamplePdf}
            >
              Test with sample PDF
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {text !== null && (
          <div className="mt-6">
            <Label htmlFor="extracted-text" className="text-muted-foreground">
              Extracted text
            </Label>
            <pre
              id="extracted-text"
              className="mt-2 max-h-[60vh] overflow-auto rounded-md border bg-muted/50 p-4 text-sm whitespace-pre-wrap"
            >
              {text || "(no text extracted)"}
            </pre>
            <p className="mt-2 text-sm text-muted-foreground">
              Length: {text.length} characters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
