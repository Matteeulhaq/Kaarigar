import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PHProvider } from "@/lib/posthog-provider";
import { TestModeIndicator } from "@/components/testing/TestModeIndicator";
import { ResearcherNotes } from "@/components/testing/ResearcherNotes";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Kaarigar — Skilled Workers Near You",
  description: "On-demand marketplace connecting households with trusted nearby plumbers, electricians, AC technicians, and carpenters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} font-sans`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PHProvider>
          <Suspense fallback={null}>
            <TestModeIndicator />
            <ResearcherNotes />
          </Suspense>
          {children}
          <Toaster richColors position="top-right" />
        </PHProvider>
      </body>
    </html>
  );
}
