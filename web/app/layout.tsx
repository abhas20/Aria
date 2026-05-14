import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DM_Sans, DM_Serif_Display, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import AuthProvider from "./providers/AuthProviders";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Aria — AI Health Companion",
  description: "Your personal AI health companion for women's wellness",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aria",
  },
};

export const viewport: Viewport = {
  themeColor: "#e91e8c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${dmSans.variable}`} suppressHydrationWarning={true}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
