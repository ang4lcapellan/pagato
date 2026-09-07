import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "@fontsource-variable/manrope";
import "./globals.css";
import { getPresentation } from "@/modules/preferences/server/service";
import { PresentationProvider } from "@/modules/preferences/components/presentation-provider";
import { PwaProvider } from "@/modules/pwa/components/pwa-provider";
import { TelemetryConsent } from "@/modules/telemetry/components/telemetry-consent";
import { publicSiteUrl, siteDescription, siteName } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl()),
  title: {
    default: siteName,
    template: "%s | PagaTo'",
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["finanzas personales", "presupuestos", "gastos", "ingresos", "cuentas"],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  openGraph: { type: "website", locale: "es_DO", siteName, title: siteName, description: siteDescription, url: "/" },
  twitter: { card: "summary_large_image", title: siteName, description: siteDescription },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "PagaTo'", statusBarStyle: "default" },
  icons: { apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4FAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#141615" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Resolve the authenticated presentation only for an incoming request.
  await connection();
  const { owner, preferences } = await getPresentation();
  return (
    <html lang={preferences.locale} data-theme={preferences.theme} className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col"><PresentationProvider key={owner ?? "guest"} preferences={preferences}><PwaProvider>{children}<TelemetryConsent /></PwaProvider></PresentationProvider></body>
    </html>
  );
}
