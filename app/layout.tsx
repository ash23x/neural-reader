import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RSVP Neural Reader — Speed Read Anything",
  description: "AI-powered speed reading engine. Upload PDFs, paste text, read at 10x speed with psycholinguistic optimisation.",
  openGraph: {
    title: "RSVP Neural Reader",
    description: "Speed read anything. AI-powered PDF analysis. Psycholinguistic engine.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
