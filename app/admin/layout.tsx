import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="w-full border-b border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto h-14 px-4 flex items-center">
            <Link href="/" className="text-lg font-semibold text-slate-900">
              PdCon
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

