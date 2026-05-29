import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "./providers/AuthProviders";

export const metadata: Metadata = {
  title: "Aria - PCOS Wellness Companion",
  description: "Simple cycle, symptom, mood, and lifestyle support for women managing PCOS.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aria",
  },
};

export const viewport: Viewport = {
  themeColor: "#e64b6a",
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
    <html lang="en" suppressHydrationWarning={true}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
