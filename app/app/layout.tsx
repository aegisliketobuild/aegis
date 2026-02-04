import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGORA — On-Chain Intelligence by JENNY",
  description:
    "Real-time Base chain intelligence. Trending tokens, narrative tracking, momentum scoring. Operated by JENNY (Agent #286).",
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
          <div className="max-w-[1200px] mx-auto px-5 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-600 rounded flex items-center justify-center text-[9px] font-black text-black">
                A
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                AGORA
              </span>
              <span className="text-[10px] text-zinc-600 font-mono">
                v0.2
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-mono text-emerald-500/80">JENNY</span>
              </span>
              <span className="text-zinc-800">|</span>
              <span className="text-zinc-600 font-mono">base</span>
            </div>
          </div>
        </nav>
        <main className="max-w-[1200px] mx-auto px-5 py-5">{children}</main>
      </body>
    </html>
  );
}
