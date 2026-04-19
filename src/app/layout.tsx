import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider }  from "@/contexts/AuthContext";
import { QueryProvider } from "@/components/layout/QueryProvider";
import { I18nProvider }  from "@/lib/i18n/context";
import { Toaster }       from "@/components/ui/toaster";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title:       "PoolPal AI — Pool Service, Automated",
  description: "AI-powered pool service management. Routes, chemistry, reports, invoicing — all in one platform.",
  manifest:    "/manifest.json",
  icons: {
    icon:        [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icon.png" }],
    apple:       [{ url: "/icon.png", sizes: "180x180" }],
    shortcut:    "/favicon.svg",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "PoolPal AI" },
  openGraph: {
    title:       "PoolPal AI",
    description: "AI-powered pool service management",
    images:      ["/icon.png"],
  },
};

export const viewport: Viewport = {
  themeColor:   "#1756a9",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable} font-sans bg-white text-slate-900 antialiased`}>
        <QueryProvider>
          <I18nProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
