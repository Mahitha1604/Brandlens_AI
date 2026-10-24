import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BrandSessionProvider } from "@/context/BrandSessionContext";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrandLens AI — Evidence-First Brand Governance & Compliance Studio",
  description:
    "Multi-layer brand compliance review studio combining deterministic rule checks, contextual AI analysis, and evidence-backed governance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-50/70 text-gray-900 flex flex-col">
        <BrandSessionProvider>
          <AppShell>{children}</AppShell>
        </BrandSessionProvider>
      </body>
    </html>
  );
}
