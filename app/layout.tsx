import type { Metadata } from "next";
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import PayoutBanner from "@/components/PayoutBanner";
import { StoreProvider } from "@/components/StoreContext";
import WebMcp from "@/components/WebMcp";

const sora = Sora({ weight: ["400", "600", "700"], subsets: ["latin"], variable: "--font-sora" });
const plexSans = IBM_Plex_Sans({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Cumulus: tradeable downtime protection",
  description:
    "An open market for real downtime protection: hedge cloud outages or sell coverage, settled automatically by telemetry.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="antialiased">
        <WebMcp />
        <StoreProvider>
          <Header />
          <PayoutBanner />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
