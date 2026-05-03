import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "CineVault | Unlimited Movies, Digital Vault",
  description: "Experience the latest blockbusters and all-time classics in stunning quality. High-speed streaming and TMDb enriched data.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { ToastProvider } from "@/components/Toast/Toast";
import MaintenanceProvider from "@/components/Maintenance/MaintenanceProvider";
import AnnouncementBanner from "@/components/Announcement/AnnouncementBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-scroll-behavior="smooth">
      <body>
        <MaintenanceProvider>
          <ToastProvider>
            <AnnouncementBanner />
            {children}
          </ToastProvider>
        </MaintenanceProvider>
      </body>
    </html>
  );
}
