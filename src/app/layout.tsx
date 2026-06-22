import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { AnalyticsInit } from "@/components/AnalyticsInit";
import { AppStatusGuard } from "@/components/AppStatusGuard";
import { ConsentGuard } from "@/components/ConsentGuard";
import { SyncInit } from "@/components/SyncInit";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HighWise — כלי עזר להפחתת הסיכון למחלת גבהים",
  description:
    "הערכת סיכון ראשונית למחלת גבהים על בסיס נתוני גובה ותסמינים. אינה מחליפה ייעוץ רפואי.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HighWise",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1565C0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body>
        <ServiceWorkerRegistration />
        <AnalyticsInit />
        <SyncInit />
        <AppStatusGuard>
          <ConsentGuard>
            <div id="app-shell">{children}</div>
          </ConsentGuard>
        </AppStatusGuard>
      </body>
    </html>
  );
}
