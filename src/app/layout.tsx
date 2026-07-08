import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import KnobsPanel from "../knobs/KnobsPanel";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Knobtastic — tune your UI like a synth",
  description:
    "Bind a MIDI controller to your CSS design tokens. Twist to explore live, hit Commit to write the values back to source.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {process.env.NODE_ENV === "development" && <KnobsPanel />}
      </body>
    </html>
  );
}
