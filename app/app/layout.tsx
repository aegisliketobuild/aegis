import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGORA",
  description: "The Permissionless Marketplace on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#09090b]/80 border-b border-[#27272a]">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-600 rounded-md" />
              <span className="text-lg font-bold tracking-tight text-white">
                AGORA
              </span>
            </div>
            <div className="flex items-center gap-5 text-[13px] text-zinc-500">
              <span className="hidden sm:flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                JENNY online
              </span>
              <span className="hidden sm:inline text-zinc-600">|</span>
              <span className="text-zinc-600">devnet</span>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
