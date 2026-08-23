import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "SwiftTill POS",
  description: "Ultra-fast restaurant point-of-sale.",
  manifest: "/manifest.webmanifest",
  applicationName: "SwiftTill POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SwiftTill",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
