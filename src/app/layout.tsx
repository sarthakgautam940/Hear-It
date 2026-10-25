import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/controls.css";
import "@/styles/overlays.css";
import "@/styles/shell.css";
import "@/styles/workspace.css";
import "@/styles/table.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "@/components/shell/ServiceWorkerRegistration";
import { Shell } from "@/components/shell/Shell";
import { ToastProvider } from "@/components/ui/Toast";
import { BRAND } from "@/lib/brand";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s | ${BRAND.name}` },
  description: BRAND.purpose,
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#171614" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="system" suppressHydrationWarning>
      <head>
        {/* General Sans is served by Fontshare's API, which its license permits; the files may not be redistributed. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@1,2&display=swap"
        />
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="hi-app">
        <ToastProvider>
          <Shell>{children}</Shell>
        </ToastProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
