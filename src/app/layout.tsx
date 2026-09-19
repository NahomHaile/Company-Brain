import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cadence",
  description: "The sales hire an early founder can't afford yet.",
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
      <body className="flex min-h-full flex-col">
        <nav className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur print:hidden">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight">Cadence</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                one engine, two recipes
              </span>
            </Link>
            <div className="flex items-center gap-1 text-xs">
              <Link
                href="/"
                className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Battlecard
              </Link>
              <Link
                href="/update"
                className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Investor update
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex flex-1 flex-col">{children}</div>

        <footer className="border-t print:hidden">
          <p className="mx-auto w-full max-w-2xl px-5 py-4 text-xs leading-relaxed text-muted-foreground">
            Built for Chatathon 2026, Track 01 (Misneach), Northeastern. Maya Okonkwo and Thicket
            are synthetic and created for demonstration. Time-savings figures are persona-research
            estimates, not measured studies.
          </p>
        </footer>
      </body>
    </html>
  );
}
