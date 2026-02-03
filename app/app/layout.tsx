import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGORA -- The AI-Operated Marketplace",
  description:
    "A marketplace with zero employees. JENNY scans every listing, judges every dispute, manages every reputation score. No humans in the loop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#09090b]/80 border-b border-[#1a1a1e]">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-600 rounded-md flex items-center justify-center text-[10px] font-black text-black">
                A
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                AGORA
              </span>
              <span className="hidden sm:inline text-[11px] text-zinc-600 font-mono ml-1">
                v0.1
              </span>
            </div>
            <div className="flex items-center gap-4 text-[13px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="hidden sm:inline">JENNY</span>
                <span className="text-emerald-500 text-xs font-mono">
                  autonomous
                </span>
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-600 text-xs font-mono">
                solana devnet
              </span>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
