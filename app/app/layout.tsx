import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGORA - The Permissionless Marketplace",
  description:
    "Censorship-resistant marketplace on Solana. No fees. No middlemen. No government.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-aegis-border px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                A
              </div>
              <span className="text-xl font-bold text-white">AGORA</span>
              <span className="text-sm text-gray-500">
                Permissionless Marketplace
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                JENNY Online
              </span>
              <span>Solana Devnet</span>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
