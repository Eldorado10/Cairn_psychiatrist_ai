import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { ScrollRefresh } from "@/components/providers/scroll-refresh";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: "Cairn",
  description: "Cairn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${interTight.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-ink text-bone font-body">
        <SmoothScroll>
          <ScrollRefresh />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
