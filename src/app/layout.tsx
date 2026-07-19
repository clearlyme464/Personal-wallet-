import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crypto Spending Overview",
  description: "Track where your crypto wallets' money came from and where it went.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <header className="border-b border-[var(--border)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold text-text-primary">
              Crypto Spending Overview
            </Link>
            <nav className="flex gap-4 text-sm text-text-secondary">
              <Link href="/" className="hover:text-text-primary">
                Wallets
              </Link>
              <Link href="/overview" className="hover:text-text-primary">
                Portfolio Overview
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
