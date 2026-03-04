import type { Metadata } from "next";
import "./globals.css";

const siteTitle = "Mapleins - Get Canadian Job Interviews or Pay Nothing";
const siteDescription =
  "Free Canadian resume format, ATS optimization, curated jobs, and interview prep. Optional donation to support us.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
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
