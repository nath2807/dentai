import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dentarith.me"),
  title: "Dentarith | Clinical Intelligence for Dentistry",
  description:
    "Dentarith Clinical Copilot helps dentists structure clinical findings, explore diagnostic possibilities, identify missing information, and review treatment considerations with explainable AI-assisted clinical reasoning.",
  openGraph: {
    title: "Dentarith | Clinical Intelligence for Dentistry",
    description:
      "Dentarith Clinical Copilot helps dentists structure clinical findings, explore diagnostic possibilities, identify missing information, and review treatment considerations with explainable AI-assisted clinical reasoning.",
    url: "https://dentarith.me",
    siteName: "Dentarith",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dentarith | Clinical Intelligence for Dentistry",
    description:
      "Dentarith Clinical Copilot helps dentists structure clinical findings, explore diagnostic possibilities, identify missing information, and review treatment considerations with explainable AI-assisted clinical reasoning.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
