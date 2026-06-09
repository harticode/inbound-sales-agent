import type { Metadata } from "next";
import Link from "next/link";
import { PhoneIncoming, Truck, Handshake, Settings as SettingsIcon } from "lucide-react";
import Providers from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inbound Sales Agent",
  description: "AI-powered inbound carrier sales — Acme Logistics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <header className="sticky top-0 z-50 border-b border-border bg-canvas/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <PhoneIncoming className="text-primary" size={22} />
              </div>
              <div>
                <h1 className="text-lg font-medium text-ink">Inbound Sales Agent</h1>
                <p className="text-xs text-ink-muted">AI carrier sales &bull; Acme Logistics</p>
              </div>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/loads" className="btn-ghost">
                <Truck size={16} />
                <span className="hidden sm:inline">Loads</span>
              </Link>
              <Link href="/negotiate" className="btn-ghost">
                <Handshake size={16} />
                <span className="hidden sm:inline">Negotiate Sandbox</span>
              </Link>
              <Link
                href="/settings"
                className="btn-ghost"
                aria-label="Settings"
              >
                <SettingsIcon size={16} />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </nav>
          </div>
        </header>

        <Providers>{children}</Providers>

        <footer className="border-t border-border py-8 text-center text-xs text-ink-muted">
          Inbound Carrier Sales &bull; Powered by HappyRobot &bull; {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
