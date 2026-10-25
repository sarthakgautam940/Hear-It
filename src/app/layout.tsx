import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/device.css";
import "@/styles/shell.css";
import "@/styles/components.css";
import "@/styles/features.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Device } from "@/device/Device";
import { BAR_COLOR } from "@/device/phone";
import { BRAND } from "@/lib/brand";
import { BOOT_SCRIPT } from "@/lib/theme";
import { AppShell } from "@/shell/AppShell";

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s | ${BRAND.name}` },
  description: BRAND.purpose,
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android shrinks the page above its keyboard, so sheets stay in view.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BAR_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: BAR_COLOR.dark },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="system" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/InterVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/SourceSerif4-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <Device>
          <AppShell>{children}</AppShell>
        </Device>
      </body>
    </html>
  );
}
