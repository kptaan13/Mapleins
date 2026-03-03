import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapleins - Get Canadian Job Interviews or Pay Nothing",
  description: "Free Canadian resume format, ATS optimization, curated jobs, and interview prep. Optional donation to support us.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{ fontFamily: '"GeistSans", system-ui, -apple-system, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
